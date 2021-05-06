"""

    gp_lister:  Generate listing of GPs throughout victoria.

    This program is designed to generate a listing of all GP clinics
    in Victoria using information from the Victorian Government's Human
    Services Directory.  It's basically a scrape of their website search
    form dumped into a CSV file for use in excel.

"""


import re
import mechanize
import csv


# Create file for output 
outFile = file("gp_list.csv","w")
outCSV = csv.writer(outFile)

# Create needed REs as global objects
# Outer RE matching on the table row (class dTableItem)
rowRE = re.compile(r"<tr class=\"dTableItem\">(.*?)</tr>",re.S)
# RE matching the name of the practice
nameRE = re.compile(r"<a [^>]*><u>(.*?)</u></a>",re.S)
# RE matching the address of the practice
addRE = re.compile(r"<td>(.*), (.*?) VIC (3.{3})$",re.S)
# RE matching the phone data section
phoneRE = re.compile(r"\((.{2})\) (.{4}) (.{4})",re.S)

def process_page(contents):
    """Process the contents of a page of results.
    This function scrapes through the HTML of the page, finding table
    rows that contain GP practice data.  For each one that is found,
    the following details are written into the CSV file:
         * name of practise
         * Address
         * Suburb
         * Postcode
         * Phone number
    """
    for row in rowRE.finditer(contents):
       rowData = row.groups()[0]
       cells = rowData.split("</td>")
       pName = nameRE.search(cells[1]).groups()[0]
       (pAddr,pSuburb,pPostcode) = addRE.search(cells[3]).groups()
       pPhone = phoneRE.search(cells[4])
       if pPhone is None:
           pPhone = ""
       else:
           pPhone = pPhone.groups()
           pPhone = "(%s)%s%s" % pPhone
       vals = (pName,pAddr,pSuburb,pPostcode,pPhone)
       print "FOUND:", vals
       outCSV.writerow(vals)
    print "-----------------------------------------------"
    outFile.flush()
 

# Open up the search page in a Browser
b = mechanize.Browser()
b.open("http://humanservicesdirectory.vic.gov.au/Search.aspx")
# Perform the initial search, restricting to GPs
b.select_form(name="Form1")
b.set_value(name="BasicSearch1:cboTypeOfService",value=("35.19",))
b.submit()
# Iterate through the result pages
while True:
    # process the page
    process_page(b.response().read())
    # break if no 'next' link
    try:
        nextLink = b.find_link(text="next")
    except mechanize.LinkNotFoundError:
        break
    # Extract the javascript arguments from the 'next' link
    evData = nextLink.url.split("__doPostBack")[1]
    evData = evData[1:-1].split(",")
    evTarget = evData[0][1:-1]
    evArg = evData[1][1:-1]
    # Simulate javascript behind the 'next' link
    b.select_form(name="Form1")
    # Cant set value of hidden fields by default, need to force it on
    b.find_control("__EVENTTARGET").readonly = False
    b.set_value(name="__EVENTTARGET",value=":".join(evTarget.split("$")))
    b.find_control("__EVENTARGUMENT").readonly = False
    b.set_value(name="__EVENTARGUMENT",value=evArg)
    # Dont want these button's being passed to the server, as it might
    # think we clicked on one of them
    b.find_control("btnRefineSearch").disabled = True
    b.find_control("btnNewSearch").disabled = True
    b.find_control("btnPrint").disabled = True
    b.find_control("btnSaveAs").disabled = True
    b.submit()

