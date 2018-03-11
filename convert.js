#!/usr/bin/env node

var fs = require('fs');
var path = require('path');
var icalToolkit = require('ical-toolkit');

var args = (function() {
  return process.argv.slice(2).reduce(
    function(args, x) {
      if (x[0] === '-') {
        var i = x.indexOf('=');
        args[x.substr(1, i > 0 ? i - 1 : undefined)] =
          i > 0 ? x.substr(i + 1) : true;
      } else args.params.push(x);
      return args;
    },
    { params: [] },
  );
})();

function convert(rtmPath) {
  var icsText = fs.readFileSync(rtmPath, 'utf8');
  var projects = {};

  function mkDateStr(str) {
    return str.substr(0, 4) + '-' + str.substr(4, 2) + '-' + str.substr(6, 2);
  }

  function mkDate(str) {
    if (str) {
      return new Date(mkDateStr(str));
    } else {
      return null;
    }
  }

  function mkTimeStr(str) {
    return str.substr(9, 2) + ':' + str.substr(11, 2) + ':' + str.substr(13, 2);
  }

  function mkTime(str) {
    if (str) {
      const iso = mkDateStr(str) + 'T' + mkTimeStr(str) + 'Z';
      return new Date(iso);
    } else {
      return null;
    }
  }

  function tidyText(str) {
    if (str) {
      return str.replace(/\\/g, '');
    } else {
      return str;
    }
  }

  function emptyProject(list) {
    return {
      name: list,
      items: [],
    };
  }

  function script(project) {
    const s = [
      `var areaName = "Remember the Milk";
var projectName = '${project.name}';

var things = Application('Things');
var area = things.areas[areaName];

try {
  area.name();
} catch (e) {
  area = things.Area({ name: areaName });
  things.areas.push(area);
}

var project = things.projects[projectName];

try {
  project.name();
} catch (e) {
  project = things.Project({ name: projectName, area });
  things.projects.push(project);
}

var toDo;
`,
    ];

    project.items.forEach(toDo => {
      s.push(`toDo = things.ToDo({`);
      s.push(`  name: ${JSON.stringify(toDo.name)},`);
      s.push(`  status: ${JSON.stringify(toDo.status)},`);
      if (toDo.tags.length > 0) {
        s.push(`  tagNames: ${JSON.stringify(toDo.tags.join(','))},`);
      }
      if (toDo.notes) {
        s.push(`  notes: ${JSON.stringify(toDo.notes)},`);
      }
      if (toDo.dueDate) {
        s.push(`  dueDate: new Date(${toDo.dueDate.getTime()}),`);
      }
      if (toDo.completionDate) {
        s.push(`  completionDate: new Date(${toDo.completionDate.getTime()}),`);
      }
      s.push(`  project,`);
      s.push(`});`);
      s.push(`things.toDos.push(toDo);`);
      s.push(``);
    });

    return s.join('\n');
  }

  icalToolkit.parseToJSON(icsText, function(err, json) {
    if (err) throw err;

    var todos = json.VCALENDAR[0].VTODO;
    todos.forEach(src => {
      const completed = src.STATUS === 'COMPLETED';

      if (!args.completed && completed) {
        return;
      }

      var toDo = {
        name: tidyText(src.SUMMARY),
        status: completed ? 'completed' : 'open',
      };

      const due = src['DUE;VALUE=DATE'];
      if (due) {
        toDo.dueDate = mkDate(due);
      }

      if (completed) {
        const completionTime = src.COMPLETED;
        if (completionTime) {
          toDo.completionDate = mkTime(completionTime);
        }
      }

      var notes = src.DESCRIPTION; // 'Time estimate: none\\nTags: none\\nLocation: none\\n\\n',

      var line = notes.split('\\n');
      var tags = line[1].substr(6).split('\\, ');
      if (line[4] === '---') {
        toDo.notes = tidyText(line.slice(5).join('\n'));
      }

      var list;
      if (tags.length === 1 && tags[0] === 'none') {
        list = 'unsorted';
        tags = [];
      } else {
        const i = tags.findIndex(tag => tag[0] === '+');
        if (i >= 0) {
          list = tags[i].substr(1);
          tags.splice(i, 1);
        } else {
          list = 'unknown';
        }
      }
      toDo.tags = tags;

      const url = src.URL;
      if (url) {
        if (toDo.notes) {
          toDo.notes += '\nurl: ' + url;
        } else {
          toDo.notes = `url: ${url}`;
        }
      }

      const repeat = src.RRULE;
      if (!args['no-repeat'] && !completed && repeat) {
        if (toDo.notes) {
          toDo.notes += '\nrepeat: ' + repeat;
        } else {
          toDo.notes = `repeat: ${repeat}`;
        }
        toDo.tags.push('rtm-repeat');
      }

      if (projects[list] == null) {
        projects[list] = emptyProject(list);
      }
      projects[list].items.push(toDo);
    });

    Object.keys(projects).forEach(projectName => {
      const project = projects[projectName];
      var json = JSON.stringify(project);
      fs.writeFileSync('out/' + projectName + '.json', json, 'utf8');
      fs.writeFileSync('out/' + projectName + '.js', script(project), 'utf8');
    });
  });
}

if (args.params.length < 1) {
  console.log('usage: rtmtothings [options] ICS-IN');
  console.log('The options are as follows:');
  console.log('-completed  include completed tasks');
  console.log("-no-repeat  don't include repeat information");
} else {
  convert.apply(null, args.params);
}
