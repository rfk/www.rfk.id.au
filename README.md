# Static site contents for https://www.rfk.id.au

In case the name didn't give it away, this is the source repo for my website at https://www.rfk.id.au/.

It's currently generated using [Zola](https://www.getzola.org/) and hosted on [Fastmail](fastmail.com/).
Deployments are managed automatically via GitHub Actions, approximately as follows:

* There is a `built` branch containing the content to be deployed,
  i.e. the contents of the `./public/` directory produced by `zola build`.
    * Keeping this in git makes the subsequent deploy step easier,
      see below.
* Each push to `main` triggers a GitHub action to build the new
  contents and push them to the `built` branch.
* Each push to the `built` branch triggers a GitHub action to copy
  updated files over to Fastmail.
    * The deployed code knows what commit on the `built` branch
      if was deployed from, so we can push out just the files
      that have changed. This helps us make a more efficient
      deploy process on top of the...uh...suboptimal deploy
      target of Fastmail webdev files.

For local development:

* Make sure you've `git submodule update`d to get the latest theme (thanks, [@bennetthardwick](https://github.com/bennetthardwick/simple-dev-blog-zola-starter)!)
* Install [Zola](https://github.com/getzola/zola) v0.14.
* Run: `zola serve`.
* Push to `main` when ready to deploy.
