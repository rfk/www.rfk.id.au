
import os
import re
import yaml
import html

ENTRIES = "./content/blog/entry"

for nm in os.listdir(ENTRIES):
    entry_path = os.path.join(ENTRIES, nm, "index.md")
    print(nm)
    if not os.path.isfile(entry_path):
        continue
    with open(entry_path) as infile:
        content = []
        for ln in infile:
            if ln.startswith("\"blog/tags\" ="):
                ln = "tags =" + ln[len("\"blog/tags\" ="):]
            content.append(ln)
        with open(entry_path, "w") as outfile:
            for ln in content:
                outfile.write(ln)