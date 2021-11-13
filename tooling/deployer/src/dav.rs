//! WebDAV helpers for interacting with Fastmail.
//!
//! This module provides a thin wrapper on top of `reqwest::Client` that is
//! specialised for speaking WebDAV. Note that thanks to the way the deploy
//! works from GitHub, we only need the following operations:
//!
//!   - Get the contents of a specific file
//!   - Upload a specific file
//!   - Delete a specific file
//!   - Rename a specific file
//!
//! This lets us avoid some of the more complex parts of webdav, like
//! listing files.

use anyhow::{bail, Result};
use async_recursion::async_recursion;

pub struct Client {
    inner: reqwest::Client,
    base: reqwest::Url,
    username: String,
    password: String,
}

impl Client {
    pub fn new(
        base: impl reqwest::IntoUrl,
        username: impl Into<String>,
        password: impl Into<String>,
    ) -> Result<Self> {
        let inner = reqwest::Client::builder()
            .https_only(true)
            .use_native_tls()
            .build()?;
        Ok(Self {
            inner,
            base: base.into_url()?,
            username: username.into(),
            password: password.into(),
        })
    }

    pub async fn get(&self, path: impl AsRef<str>) -> Result<String> {
        Ok(self
            .request(reqwest::Method::GET, path)?
            .send()
            .await?
            .error_for_status()?
            .text()
            .await?)
    }

    pub async fn put(&self, path: impl AsRef<str>, body: bytes::Bytes) -> Result<()> {
        let path = path.as_ref();
        // Optimistically, assume the containing directory exists.
        let mut res = self._put(path, body.clone()).await?;
        if res.status() == reqwest::StatusCode::CONFLICT {
            // A conflict typically means the containing directory does not exist.
            // See if we can create it, then try again.
            self._mkcols(path).await?;
            res = self._put(path, body).await?;
        }
        res.error_for_status()?;
        Ok(())
    }

    async fn _put(
        &self,
        path: impl AsRef<str>,
        body: impl Into<reqwest::Body>,
    ) -> Result<reqwest::Response> {
        Ok(self
            .request(reqwest::Method::PUT, path)?
            .body(body)
            .send()
            .await?)
    }

    #[async_recursion]
    async fn _mkcols(&self, path: &str) -> Result<()> {
        if let Some((parent, _)) = path.rsplit_once('/') {
            let mut res = self._mkcol(parent).await?;
            if res.status() == reqwest::StatusCode::CONFLICT {
                // A conflict typically means the containing directory does not exist.
                // See if we can create it, then try again.
                self._mkcols(parent).await?;
                res = self._mkcol(parent).await?
            }
            res.error_for_status()?;
        }
        Ok(())
    }

    async fn _mkcol(&self, path: impl AsRef<str>) -> Result<reqwest::Response> {
        Ok(self
            .request(reqwest::Method::from_bytes(b"MKCOL")?, path)?
            .send()
            .await?)
    }

    pub async fn delete(&self, path: impl AsRef<str>) -> Result<()> {
        self.request(reqwest::Method::DELETE, path)?
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    pub async fn rename(&self, path: impl AsRef<str>, new_path: impl AsRef<str>) -> Result<()> {
        self.request(reqwest::Method::from_bytes(b"MOVE")?, path)?
            .header("Destination", self.url(new_path)?.to_string())
            .send()
            .await?
            .error_for_status()?;
        Ok(())
    }

    fn request(
        &self,
        method: reqwest::Method,
        path: impl AsRef<str>,
    ) -> Result<reqwest::RequestBuilder> {
        let url = self.url(path)?;
        println!("REQ {} {}", method, url);
        Ok(self
            .inner
            .request(method, url)
            .basic_auth(&self.username, Some(&self.password)))
    }

    fn url(&self, path: impl AsRef<str>) -> Result<reqwest::Url> {
        let path = path.as_ref();
        if path.starts_with('/') {
            bail!("Don't use absolute paths")
        }
        Ok(self.base.join(path)?)
    }
}
