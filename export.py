
import os
import re

EXPORT_DIR = "/storage/software/rfk.github.com/content/blog/entry"

from rfk.models import BlogEntry

for entry in BlogEntry.objects.all():
    mydir = os.path.join(EXPORT_DIR,entry.slug)
    print "EXPORTING", mydir
    if not os.path.isdir(mydir):
        os.mkdir(mydir)
    with open(os.path.join(mydir,"index.html"),"w") as f:
        f.write("---\n")
        f.write("title: >\n %s\n" % (entry.title,))
        if entry.subtitle:
            f.write("subtitle: >\n %s\n" % (entry.subtitle,))
        f.write("slug: %s\n" % (entry.slug,))
        f.write("created: !!timestamp '%s'\n" % (entry.created,))
        f.write("modified: !!timestamp '%s'\n" % (entry.modified,))
        if entry.categories.count():
            f.write("tags: \n")
            for cat in entry.categories.all():
                f.write("    - %s\n" % (cat.name.lower(),))
        f.write("---\n\n")
        #  Escape jinja2 tag markers
        body = re.sub("(({%)|(%})|({{)|(}}))","{{ '\\1' }}",entry.body)
        #  Insert {% mark excerpt %} as needed
        if entry.is_excerpted():
            excerpt = "{% mark excerpt %}" + entry.excerpt() + "{% endmark %}"
            body = body.replace(entry.excerpt(),excerpt)
        else:
            body = "{% mark excerpt %}" + body + "{% endmark %}"
        f.write(body)


