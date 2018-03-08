# rtmtothings

`rtmtothings` can convert your tasks from RTM (Remember the Milk) to Things 3.
It takes the iCal export file that RTM can produce and converts it into
requests that can be sent to the
[Things 3 URL Scheme's `add-json` command](https://support.culturedcode.com/customer/en/portal/articles/2803573#add-json).
It works with the macOS version of Things 3 - it may be possible to import
the resulting JSON on iOS, but I've not tried that myself.

`rtmtothings` is derived from [wundermilk](https://github.com/laktak/wundermilk)
and uses the same basic approach to extract tasks from an RTM iCal export file.
Many thanks to Christian for the kickstart.

## Limitations

RTM's export to iCal format does not provide all the information recorded
for every task:

* It does not include the name of the list that a task belongs to.
To workaround this, tag each task with a tag in the form '+list'.
`rtmtothings` will place each task into a Things 3 project named after
the '+list' tag. (See Step 1 below).

* It does not record the relationship between tasks and subtasks, so all
subtasks will become separate to-dos.

There are also some limitations on the Things 3 side:

* To-dos don't have a priority, so this information from RTM is lost.

* `add-json` does not support creating to-do items that are
complete and have completion dates in the past.
To work around this you can optionally create a SQL script that will
update the Things 3 database directly after import,
but this approach is not supported by Cultured Code so use at your own risk.

* Tags on to-do items are only imported if the tag already exists in
Things 3.

* `add-json` does not support repeating to-dos.

## Step 1

As mentioned above, the RTM iCal export file does not include any information
about your RTM lists.
To work around this, before you export your data from RTM tag each task
with a tag in the form '+list'.

For example, is you have a list called 'Personal':

* Click on the 'Personal' list
* Select all the tasks (keyboard shortcut is '*' then 'a')
* Tag all the selected tasks as '+personal' (note that tag names are all
  lowercase in RTM)
* Click on 'Completed'
* Select all the completed tasks
* Tag all the selected tasks as '+personal' as well

## Step 2

Download your iCal export file from Remember the Milk.

Go to http://www.rememberthemilk.com/icalendar/YOURUSERNAME (replace `YOURUSERNAME` with your username) and download the ics file.

## Step 3

If you want to be able to locate to-dos that were repeating tasks in RTM,
create a tag in Things called `rtm-repeat`.

## Step 4

Install wundermilk: `npm i wundermilk -g`

Convert your tasks from ICS to the Wunderlist JSON format:

```
wundermilk WUNDERLIST-IN ICS-IN WUNDERLIST-OUT
```

- WUNDERLIST-IN: File downloaded in step 1
- ICS-IN: File downloaded in step 2
- WUNDERLIST-OUT: new JSON file (e.g. converted.json)

wundermilk will report the tasks it found:

```
Converting the following tags to lists: inbox, futures, work, misc
Found 26 open tasks
inbox (3)
 - world domination
 - just kidding
 - really
futures (17)
[..]
```

If you get an error see [#1](https://github.com/laktak/wundermilk/issues/1) for a possible solution.

## Step 4

Go to https://www.wunderlist.com, again in your favorite browser.

Click on the icon next to your name and then `Account settings`, click on `Import Backup Data` and specify the file you just created (eg. converted.json).

Your tasks should now be visible in Wunderlist. You will have to clean up any duplicate folders manually (that's just how the import works).

## Step 5

You are on you own now. Have fun. Or complete some tasks.

## Step 6

OK, some final advice. I used this tool once, it worked for me but YMMV. If you find a problem please fix it yourself (PR).

Oh and sorry but I hardcoded the due time to 7:00Z :)
