# Static site contents for https://www.rfk.id.au

In case the name didn't give it away, this is the source repo for my website at https://www.rfk.id.au/.

It's currently generated using [Zola](https://www.getzola.org/) and hosted on [Fastmail](fastmail.com/).
For my future reference, here are the basics of generating and publishing it:

* Make sure you've `git submodule update`d to get the latest theme (thanks, [@bennetthardwick](https://github.com/bennetthardwick/simple-dev-blog-zola-starter)!)
* Run: `zola build`.
* Mount Fastmail files via [WebDAV](https://www.fastmail.help/hc/en-us/articles/1500000277882-Remote-file-access).
    * [This post](https://askubuntu.com/questions/498526/mounting-a-webdav-share-by-users) was
      pretty useful to me for getting it set up under WSL.
* Run: `rsync -rlvWa --inplace --no-owner --no-group --no-times --delete ./public/ /rfkelly.fastmail.fm/files/www.rfk.id.au/`

Yeah yeah, rsync-over-webdav is likely to be inefficient, and this creates a window in which
the site may be hosting partially-updated content. But it's not going to matter at this scale.
