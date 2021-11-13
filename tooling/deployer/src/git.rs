//! Git helpers for deploying the website.
//!
//! This module provides a wrapper on top of `git2` that is specialized
//! for deploying the website. It basically knows just enough git to be
//! able to safety-check the deployment and produce a list of actions
//! to perform.

use anyhow::{anyhow, bail, Result};
use bytes::Bytes;
use std::path::Path;

pub struct Repo {
    inner: git2::Repository,
}

impl Repo {
    pub fn new(path: impl AsRef<Path>) -> Result<Self> {
        let inner = git2::Repository::open(path)?;
        Ok(Self { inner })
    }

    pub fn head(&self) -> Result<String> {
        Ok(hex::encode(
            self.inner
                .head()?
                .target()
                .ok_or_else(|| anyhow!("Failed to resolve HEAD ref"))?
                .as_bytes(),
        ))
    }

    pub fn tree(&self, commit: impl AsRef<str>) -> Result<Tree<'_>> {
        let oid = git2::Oid::from_str(commit.as_ref())?;
        Ok(Tree {
            repo: &self.inner,
            tree: self.inner.find_commit(oid)?.tree()?,
        })
    }

    pub fn diff_actions(
        &self,
        old_commit: impl AsRef<str>,
        new_commit: impl AsRef<str>,
    ) -> Result<DiffActions<'_>> {
        let old_ref = git2::Oid::from_str(old_commit.as_ref())?;
        let new_ref = git2::Oid::from_str(new_commit.as_ref())?;
        let old_tree = self.inner.find_commit(old_ref)?.tree()?;
        let new_tree = self.inner.find_commit(new_ref)?.tree()?;
        let mut opts = git2::DiffOptions::new();
        opts.force_binary(true);
        let diff =
            self.inner
                .diff_tree_to_tree(Some(&old_tree), Some(&new_tree), Some(&mut opts))?;
        Ok(DiffActions { diff })
    }
}

pub struct Tree<'r> {
    repo: &'r git2::Repository,
    tree: git2::Tree<'r>,
}

impl<'r> Tree<'r> {
    pub fn content_of(&self, path: impl AsRef<Path>) -> Result<Bytes> {
        let path = path.as_ref();
        let oid = self.tree.get_path(path)?.id();
        let blob = self.repo.find_blob(oid)?;
        let content = blob.content().to_vec();
        Ok(Bytes::from(content))
    }
}

/// A set of actions to apply a git diff.
pub struct DiffActions<'r> {
    diff: git2::Diff<'r>,
}

impl<'r> DiffActions<'r> {
    pub fn iter(&self) -> impl Iterator<Item = Result<Action<'_>>> + '_ {
        self.diff.deltas().map(TryFrom::try_from)
    }
}

/// An action that can be applied to update from a git diff.
///
/// We don't get fancy here, we support only basic whole-file actions.
#[derive(Debug)]
pub enum Action<'a> {
    Put(&'a Path),
    Delete(&'a Path),
    Rename(&'a Path, &'a Path),
}

impl<'a> TryFrom<git2::DiffDelta<'a>> for Action<'a> {
    type Error = anyhow::Error;
    fn try_from(delta: git2::DiffDelta<'a>) -> Result<Self> {
        use git2::Delta;
        Ok(match delta.status() {
            Delta::Added => Action::Put(
                delta
                    .new_file()
                    .path()
                    .ok_or_else(|| anyhow!("Expected new_file in Delta::Added"))?,
            ),
            Delta::Modified => {
                // We insist git treat all files as binary, so I think it should never
                // try to give us a move-and-modify, just an in-place modify.
                if delta.new_file().path() != delta.old_file().path() {
                    bail!("Unexpected file move in Delta::Modified")
                }
                Action::Put(
                    delta
                        .new_file()
                        .path()
                        .ok_or_else(|| anyhow!("Expected new_file in Delta::Modified"))?,
                )
            }
            Delta::Deleted => Action::Delete(
                delta
                    .old_file()
                    .path()
                    .ok_or_else(|| anyhow!("Expected old_file in Delta::Deleted"))?,
            ),
            Delta::Copied => Action::Put(
                delta
                    .new_file()
                    .path()
                    .ok_or_else(|| anyhow!("Expected new_file in Delta::Copied"))?,
            ),
            Delta::Renamed => Action::Rename(
                delta
                    .old_file()
                    .path()
                    .ok_or_else(|| anyhow!("Expected old_file in Delta::Renamed"))?,
                delta
                    .new_file()
                    .path()
                    .ok_or_else(|| anyhow!("Expected new_file in Delta::Renamed"))?,
            ),
            _ => bail!("DiffAction not implemented for {:?}", delta),
        })
    }
}
