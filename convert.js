#!/usr/bin/env node

var fs=require("fs");
var path=require("path");
var icalToolkit=require("ical-toolkit");
const uuid = require('uuid/v4');

var args=(function() {
  return process.argv.slice(2).reduce(function(args, x) {
    if (x[0]==="-") { var i=x.indexOf("="); args[x.substr(1, i>0?i-1:undefined)]=i>0?x.substr(i+1):true; }
    else args.params.push(x);
    return args;
  }, { params: [] });
})();

function convert(rtmPath) {

  var icsText=fs.readFileSync(rtmPath, "utf8");
  var projects={};
  let sql = [];

  function mkDate(str) {
    if (str) return str.substr(0, 4)+"-"+str.substr(4, 2)+"-"+str.substr(6, 2);
    else return null;
  }

  function mkTime(str) {
    if (str) {
      const date = mkDate(str);
      var iso = date+"T"+str.substr(9, 2)+":"+str.substr(11, 2)+":"+str.substr(13, 2)+"Z";
      var d = new Date(iso);
      const r = date+"@"+d.getHours()+":"+d.getMinutes()+":"+d.getSeconds();
      return r;
    } else {
      return null;
    }
  }

  function mkTimeFix(id, title, ts) {
    const date = mkDate(ts);
    const iso = date+"T"+ts.substr(9, 2)+":"+ts.substr(11, 2)+":"+ts.substr(13, 2)+"Z";
    const d = new Date(iso);
    const secs = d.getTime()/1000;
    title = title.replace(/'/g, "''");
    return `UPDATE TMTask SET title = '${title}', stopDate = '${secs}' WHERE title = '${id}';`
  }

  function tidyText(str) {
    if (str) {
      return str.replace(/\\/g, '');
    } else {
      return str;
    }
  }

  function emptyProject(list) {
    return [
      {
        type: "project",
        attributes: {
          title: list,
          items: [],
        },
      },
    ];
  }

  icalToolkit.parseToJSON(icsText, function (err, json) {
    if (err) throw err;

    var todos=json.VCALENDAR[0].VTODO;
    todos.forEach(src => {
      const completed = (src.STATUS === "COMPLETED");

      if (!args.completed && completed) {
        return;
      }

      var t = {
        "type": "to-do",
        "attributes": {}
      };
      var a = t.attributes;
      let title = tidyText(src.SUMMARY);

      const deadline = mkDate(src["DUE;VALUE=DATE"]);
      if (deadline)
        a.deadline = deadline;
      a.completed = completed;
      if (completed) {
        if (args.sqlfix) {
          const id = uuid();
          sql.push(mkTimeFix(id, title, src.COMPLETED));
          title = id;
        } else {
          a.when = mkTime(src.COMPLETED);
        }
      }
      a.title = title;

      var notes = src.DESCRIPTION; // 'Time estimate: none\\nTags: none\\nLocation: none\\n\\n',

      var line = notes.split("\\n");
      var tags = line[1].substr(6).split("\\, ");
      if (line[4]==="---") {
        a.notes = tidyText(line.slice(5).join("\n"));
      }

      var list;
      if (tags.length === 1 && tags[0] === "none") {
        list = "unsorted";
        tags = [];
      } else {
        const i = tags.findIndex(tag => tag[0] === '+');
        if (i >= 0) {
          list = tags[i].substr(1);
          tags.splice(i, 1);
        } else {
          list = "unknown";
        }
      }
      a.tags = tags;

      const url = src.URL;
      if (url) {
        if (a.notes) {
          a.notes += "\nurl: "+url;
        } else {
          a.notes = `url: ${url}`;
        }
      }

      const repeat = src.RRULE;
      if (!args['no-repeat'] && !completed && repeat) {
        if (a.notes) {
          a.notes += "\nrepeat: "+repeat;
        } else {
          a.notes = `repeat: ${repeat}`;
        }
        a.tags.push('rtm-repeat');
      }

      if (projects[list] == null) {
        projects[list] = emptyProject(list);
      }
      if (projects[list][0].attributes.items.length > 600) {
        let i = 1;
        while (projects[`${list}-${i}`] != null) {
          i += 1;
        }
        projects[`${list}-${i}`] = projects[list];
        projects[list] = emptyProject(list);
      }
      projects[list][0].attributes.items.push(t);
    });

    Object.keys(projects).forEach(project => {
      var json = JSON.stringify(projects[project]);
      fs.writeFileSync("out/"+project+".json", json, "utf8");
      var script = "open $'things:///add-json?data="+encodeURIComponent(json).replace(/'/g, "\\'")+"'";
      fs.writeFileSync("out/"+project+".sh", script, "utf8");
    });
    if (sql.length > 0) {
      fs.writeFileSync("out/fix-completed.sql", sql.join("\n"), "utf8");
    }
  });
}


if (args.params.length<1) {
  console.log("usage: rtmtothings [options] ICS-IN");
  console.log("The options are as follows:");
  console.log("-completed  include completed tasks");
  console.log("-sqlfix     generate SQL to set historic completion times");
  console.log("-no-repeat  don't include repeat information");
} else {
  convert.apply(null, args.params);
}
