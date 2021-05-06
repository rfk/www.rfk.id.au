
import os
import re
import yaml
import html

ENTRIES = "./content/blog/entry"

from html.parser import HTMLParser

class HTML2Markdown(html.parser.HTMLParser):

    def __init__(self):
        self.contents = []
        self.active_link = None
        self.active_block = None
        self.active_list = []
        super().__init__()

    def feed(self, data):
        data = data.replace("{% mark excerpt %}", "")
        data = data.replace("{% endmark %}", "<!-- more -->")
        data = re.sub(r"\{% syntax ([^%]*)%\}", r"<p class='code' syntax='\1'>", data)
        data = data.replace("{% endsyntax %}", "</p>")
        super().feed(data)        

    def close(self):
        super().close()
        return "".join(self.contents)

    def handle_starttag(self, tag, attrs):
        if tag == "p":
            attrs = dict(attrs)
            cls = attrs.pop("class", None)
            syntax = attrs.pop("syntax", "")
            if cls is not None and cls.startswith("code ") and syntax == "":
                cls, syntax = cls.split(None, 1)
            attrs.pop("style", None)
            assert len(attrs) == 0, f"unexpected p attrs: {attrs}"
            if cls is None:
                pass
            elif cls == "code":
                assert self.active_block == None
                self.active_block = "```"
                self.contents.append(f"```{syntax}\n")
            else:
                assert False, f"unexpected p class: {cls}"
        elif tag == "span":
            attrs = dict(attrs)
            cls = attrs.pop("class", None)
            attrs.pop("style", None)
            assert len(attrs) == 0, f"unexpected span attrs: {attrs}"
            if cls is None:
                pass
            elif cls in ("api-ref", "email-addr"):
                assert self.active_block == None
                self.active_block = "**"
                self.contents.append("**")
            else:
                assert False, f"unexpected span class: {cls}"
        elif tag == "a":
            assert self.active_link is None, "unexpected nested link"
            attrs = dict(attrs)
            attrs.pop("class", None)
            attrs.pop("style", None)
            if "href" in attrs:
                assert len(attrs) == 1, f"unexpected link attrs {attrs}"
                self.active_link = attrs["href"]
                self.contents.append("[")
            else:
                assert len(attrs) > 0, f"unexpected link attrs {attrs}"
                self.contents.append("<a")
                for nm in attrs:
                    self.contents.append(f' {nm}="{attrs[nm]}"')
                self.contents.append("></a>")
        elif tag == "pre":
            assert self.active_block == None
            self.active_block = "```"
            self.contents.append("```")
        elif tag == "i":
            self.contents.append("*")
        elif tag == "b":
            self.contents.append("**")
        elif tag == "h2":
            self.contents.append("## ")
        elif tag == "h3":
            self.contents.append("### ")
        elif tag == "h4":
            self.contents.append("#### ")
        elif tag == "br":
            self.contents.append("\n")
        elif tag == "blockquote":
            self.contents.append("> ")
        elif tag == "ul" or tag == "ol":
            self.active_list.append(tag)
        elif tag == "li":
            assert len(self.active_list) > 0, "no list active"
            if self.active_list[-1] == "ol":
                self.contents.append("1. ")
            else:
                self.contents.append("* ")
        elif tag in ("img", "hr", "table", "tbody", "th", "tr", "td"):
            self.contents.append(f"<{tag}")
            for (nm, val) in attrs:
                self.contents.append(f' {nm}="{val}"')
            self.contents.append(">")
        else:
            assert False, f"unexpected tag: {tag} / {attrs}"

    def handle_endtag(self, tag):
        if tag in ("p", "span", "pre"):
            if self.active_block is not None:
                self.contents.append(self.active_block)
                self.active_block = None
        elif tag == "a":
            self.contents.append(f"]({self.active_link})")
            self.active_link = None
        elif tag == "i":
            self.contents.append("*")
        elif tag == "b":
            self.contents.append("**")
        elif tag == "ul" or tag == "ol":
            self.active_list.pop()
        elif tag in ("img", "hr", "table", "tbody", "th", "tr", "td"):
            self.contents.append(f"</{tag}>")

    def handle_data(self, data):
        self.contents.append(data)

    def handle_entityref(self, name):
        assert False, f"unexpected entityref: {name}"

    def handle_charref(self, name):
        assert False, f"unexpected charref: {name}"

    def handle_comment(self, data):
        self.contents.append(f"<!--{data}-->")


for nm in os.listdir(ENTRIES):
    entry_path = os.path.join(ENTRIES, nm, "index.md")
    print(nm)
    if not os.path.isfile(entry_path):
        continue
    with open(entry_path) as infile:
        config = []
        lines = iter(list(infile))
        # Every entry will contain a "---"-delimited section,
        # so this loop always terminates.
        while next(lines).strip() != "---":
            pass
        for ln in lines:
            if ln.strip() == "---":
                break
            config.append(ln)
        config = yaml.safe_load("".join(config))
        config.pop("slug", None)
        config.pop("subtitle", None)
        assert config.pop("listable", True)
        with open(entry_path, "w") as outfile:
            outfile.write("+++\n")
            outfile.write(f'title = "{config.pop("title").strip()}"\n')
            outfile.write(f'date = {config.pop("created").isoformat()}\n')
            if "modified" in config:
                outfile.write(f'updated = {config.pop("modified").isoformat()}\n')
            outfile.write("[taxonomies]\n")
            outfile.write(f'tags = {config.pop("tags", [])}\n')
            if len(config) != 0:
                assert False, str(config)
            outfile.write("+++\n")
            converter = HTML2Markdown()
            for ln in lines:
                converter.feed(ln)
            outfile.write(converter.close())
