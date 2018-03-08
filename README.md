# rtmtothings

`rtmtothings` can convert your tasks from
[Remember the Milk](https://www.rememberthemilk.com/) (RTM) to
[Things 3](https://culturedcode.com/things/).
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

Install rtmtothings: `npm i rtmtothings -g`

Convert your tasks from ICS to the Things 3 JSON format:

```
$ rtmtothings -completed -sqlfix <rtm-export-file>
```

## Step 4

Import into Things 3.

```
$ for i in out/*.sh; do bash $i; read foo; done
```

## Step 5

Fix completion times for to-dos in the Logbook.
First, quit Things. Then:

```
$ sqlite3 -init out/fix-completed.sql "$HOME/Library/Containers/com.culturedcode.ThingsMac/Data/Library/Application Support/Cultured Code/Things/Things.sqlite3"
-- Loading resources from out/fix-completed.sql
SQLite version 3.19.3 2017-06-27 16:48:08
Enter ".help" for usage hints.
sqlite> ^D
$
```
