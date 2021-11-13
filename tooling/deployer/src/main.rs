//! Deploy Ryan's website to Fastmail, over WebDAV.
//!
//! This is an ad-hoc deployment script to sync the build version of my
//! website out of GitHub and into Fastmail's file hosting service.
//!
//! The process is a bit janky but also kind of fun to make work :-)
//!
//! Constraints:
//!
//!   - I don't want to use GitHub pages, because I like the way
//!     Fastmail lets me set up redirects etc.
//!
//!   - Fastmail provides file access via WebDAV or FTP.
//!
//!   - Deployment runs from GitHub Actions, which means I don't have
//!     kernel-level access to mount WebDAV or FTP as a filesystem.
//!     Hence, I'm scripting a deploy that talks directly to Fastmail
//!     and have chosen WebDAV for its apparent simplicity.
//!
//!   - Re-uploading the entire website for every change is vastly
//!     inefficient, especially over WebDAV. So we need to send only
//!     incremental changes.
//!
//! Within those constraints, here's the plan:
//!
//!   - Every change to the website gets built and commited to a
//!     special `built` branch of the source repo.
//!
//!   - The deployed website gets a `CUR_COMMIT.txt` file in the root
//!     directory indicating the commit that is currently deployed.
//!
//!   - To deploy a new version, we use the diff between `CUR_COMMIT`
//!     and the new `HEAD` to find the minimal set of changes to
//!     perform for deployment, then update `CUR_COMMIT.txt` when done.
//!
//!   - We perform a little file-rename locking dance with `CUR_COMMIT.txt`
//!     to avoid concurrent deploys from trampling on each other.
//!
//! Fun, right?!?!

use anyhow::{anyhow, Result};
use bytes::Bytes;

mod dav;
mod git;

#[tokio::main]
async fn main() -> Result<()> {
    let repo = git::Repo::new(".")?;
    let new_commit = repo.head()?;

    let client = dav::Client::new(
        std::env::var("WEBDAV_BASE_URL")?,
        std::env::var("WEBDAV_USERNAME")?,
        std::env::var("WEBDAV_PASSWORD")?,
    )?;

    // A pre-deploy locking dance with `CUR_COMMIT`.
    // If the deploy fails, we'll leave the target without a `CUR_COMMIT` file
    // and it will require manual intervention.
    println!("Acquiring deploy lock");
    client.rename("CUR_COMMIT.txt", "OLD_COMMIT.txt").await?;
    let cur_commit = client.get("OLD_COMMIT.txt").await?;
    client
        .put("NEW_COMMIT.txt", Bytes::from(new_commit.clone()))
        .await?;

    // Do the actual deploy.
    differential_deploy(&repo, &client, cur_commit.trim(), new_commit.trim()).await?;

    // Mark the deploy as complete at the new commit.
    // If we fail here and leave `OLD_COMMIT` in place, it can be
    // safely overwritten on the next deploy.
    client.rename("NEW_COMMIT.txt", "CUR_COMMIT.txt").await?;
    client.delete("OLD_COMMIT.txt").await?;
    println!("Deploy successful!");

    Ok(())
}

async fn differential_deploy(
    repo: &git::Repo,
    client: &dav::Client,
    cur_commit: &str,
    new_commit: &str,
) -> Result<()> {
    println!(
        "Deploying differences from {} to {}",
        cur_commit, new_commit
    );
    let tree = repo.tree(new_commit)?;
    for action in repo.diff_actions(cur_commit, new_commit)?.iter() {
        use git::Action;
        match action? {
            Action::Put(path) => {
                client
                    .put(path_to_str(path)?, tree.content_of(path)?)
                    .await?
            }
            Action::Delete(path) => client.delete(path_to_str(path)?).await?,
            Action::Rename(old_path, new_path) => {
                // We could do a WebDAV rename, but then we'd have to worry about
                // ensuring that the destination directories exist. Meh.
                client
                    .put(path_to_str(new_path)?, tree.content_of(new_path)?)
                    .await?;
                client.delete(path_to_str(old_path)?).await?;
            }
        }
    }
    Ok(())
}

fn path_to_str(path: &std::path::Path) -> Result<&str> {
    path.to_str()
        .ok_or_else(|| anyhow!("Invalid path: {:?}", path))
}
