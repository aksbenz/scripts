// Merge reports in our custom newman html report template
const $ = require('cheerio');
const fs = require('fs');
const _ = require('lodash');
var moment = require('moment');

if (process.argv.length < 3) {
    console.log('Usage: mergereports.js <ReportFolder> [ReportsFile]');
    process.exit(1);
}

var reportPath = process.argv[2];
var reportsFileName = process.argv[3] || moment().format('YYYYMMDD_HHmmss_') + "report.html";
let lsdir = fs.readdirSync(reportPath);
let files = _.filter(lsdir, item => { return fs.statSync(reportPath + '/' + item).isFile(); })
console.log(files);

let css = {
    group: 'div.container>div.panel-group',
    folder: 'div[id^=folderPanel]',
    folderTitle: 'div[id^=folderPanel]>div>h4.panel-title',
    projectName: '#projectName',
    totalDur: '#totalDuration',
    totalDurLabel: 'div:contains("Total Run Duration")',
    totalData: '#totalData',
    avgRespTime: '#avgResponseTime',
    countIterationsTotal: '#countsIterations td:nth-child(2)',
    countIterationsFailed: '#countsIterations td:nth-child(3)',
    countRequestsTotal: '#countsRequests td:nth-child(2)',
    countRequestsFailed: '#countsRequests td:nth-child(3)',
    countPreReqTotal: '#countsPrerequests td:nth-child(2)',
    countPreReqFailed: '#countsPrerequests td:nth-child(2)',
    countTestsTotal: '#countsTests td:nth-child(2)',
    countTestsFailed: '#countsTests td:nth-child(3)',
    countAssertionsTotal: '#countsAssertions td:nth-child(2)',
    countAssertionsFailed: '#countsAssertions td:nth-child(3)',
    totalFailures: '#totalFailures td:nth-child(2)'
}

let t, root, maxDuration;
let allFolders = new Array(); // all folder results in report
let counts = {};

files.forEach((file, idx) => {
    console.log('Load File: ' + file);
    // Use first report as template    
    if (idx == 0) {
        t = $.load(fs.readFileSync(reportPath + '/' + file));
        root = t(css.group);
        let projectName = t(css.projectName).text().trim();

        // Add project name to each test folder title
        t(css.folderTitle).each((i, title) => {
            let curTitle = $(title).text().trim();
            $(title).text(projectName + " / " + curTitle);
        });

        // Add each test folder to All Folder list
        t(css.folder).each((i, fld) => {
            allFolders.push($(fld));
            // fldfile.write(JSON.stringify($(fld)));
        });

        // Remove all folders from this, from template, will add again later sorted
        root.remove(css.folder);

        maxDuration = getDuration(t(css.totalDur).text());
        console.log('Max Duration:' + maxDuration.get('h') + 'h ' + maxDuration.get('m') + 'm ' + maxDuration.get('s') + 's');
        counts = {
            'iterationsTotal': _.parseInt(t(css.countIterationsTotal).text()),
            'iterationsFailed': _.parseInt(t(css.countIterationsFailed).text()),
            'requestsTotal': _.parseInt(t(css.countRequestsTotal).text()),
            'requestsFailed': _.parseInt(t(css.countRequestsFailed).text()),
            'prerequestsTotal': _.parseInt(t(css.countPreReqTotal).text()),
            'prerequestsFailed': _.parseInt(t(css.countPreReqFailed).text()),
            'testscriptsTotal': _.parseInt(t(css.countTestsTotal).text()),
            'testscriptsFailed': _.parseInt(t(css.countTestsFailed).text()),
            'assertionsTotal': _.parseInt(t(css.countAssertionsTotal).text()),
            'assertionsFailed': _.parseInt(t(css.countAssertionsFailed).text()),
            'totalfailures': _.parseInt(t(css.totalFailures).text())
        }
    } else {
        let report = fs.readFileSync(reportPath + '/' + file);
        let r = $.load(report);
        let projectName = r(css.projectName).text().trim();

        // Add project name to each test folder title
        r(css.folderTitle).each((i, title) => {
            let curTitle = $(title).text().trim();
            $(title).text(projectName + " / " + curTitle);
        });
        r(css.folder).each((i, fld) => {
            allFolders.push($(fld));
            // fldfile.write(JSON.stringify($(fld)));
        });
        counts.requestsTotal += _.parseInt(r(css.countRequestsTotal).text());
        counts.requestsFailed += _.parseInt(r(css.countRequestsFailed).text());
        counts.prerequestsTotal += _.parseInt(r(css.countPreReqTotal).text());
        counts.prerequestsFailed += _.parseInt(r(css.countPreReqFailed).text());
        counts.testscriptsTotal += _.parseInt(r(css.countTestsTotal).text());
        counts.testscriptsFailed += _.parseInt(r(css.countTestsFailed).text());
        counts.assertionsTotal += _.parseInt(r(css.countAssertionsTotal).text());
        counts.assertionsFailed += _.parseInt(r(css.countAssertionsFailed).text());
        counts.totalfailures += _.parseInt(r(css.totalFailures).text());
        let rDuration = getDuration(r(css.totalDur).text());
        maxDuration = rDuration > maxDuration ? rDuration : maxDuration;
        console.log('Max Duration:' + maxDuration.get('h') + 'h ' + maxDuration.get('m') + 'm ' + maxDuration.get('s') + 's');
    }
    console.log(allFolders.length);
})

// fldfile.end();
let allFoldersSorted = _.sortBy(allFolders, fld => { return fld.find('div[id^=folderHead]>h4.panel-title').text().trim(); })

// Append all folder results to Template Panel Group
allFoldersSorted.forEach(fld => {
    console.log('(' + fld.find('div[id^=folderHead]>h4.panel-title').text().trim() + ')');
    root.append(fld)
});

// Update all counts
t(css.countIterationsTotal).text(counts.iterationsTotal);
t(css.countIterationsFailed).text(counts.iterationsFailed);
t(css.countRequestsTotal).text(counts.requestsTotal);
t(css.countRequestsFailed).text(counts.requestsFailed);
t(css.countPreReqTotal).text(counts.prerequestsTotal);
t(css.countPreReqFailed).text(counts.prerequestsFailed);
t(css.countTestsTotal).text(counts.testscriptsTotal);
t(css.countTestsFailed).text(counts.testscriptsFailed);
t(css.countAssertionsTotal).text(counts.assertionsTotal);
t(css.countAssertionsFailed).text(counts.assertionsFailed);
t(css.totalFailures).text(counts.totalfailures);
t(css.totalDur).text(getDurationAsText(maxDuration));
t(css.totalDurLabel).last().text('Max Run Duration');

console.log(counts);
// Create directory if not already there
!fs.existsSync(reportPath + '/merged') && fs.mkdirSync(reportPath + '/merged');
fs.writeFileSync(reportPath + '/merged/' + reportsFileName, t.html());

function getDuration(value) {
    let durationRegex = /(\d+h\s)?(\s+)?(\d+m\s)?(\s+)?([0-9]*\.[0-9]+|[0-9]+s\s)?(\d+ms)?/i;
    let s = value.match(durationRegex);
    console.log(value);
    let duration = moment.duration({
        h: s[1] ? s[1].replace('h', '') : undefined,
        m: s[3] ? s[3].replace('m', '') : undefined,
        s: s[5] ? s[5].replace('s', '') : undefined
            // ms: s[6] ? s[6].replace('ms', '') : undefined,
    });
    return duration;
}

function getDurationAsText(duration) {
    return duration.get('h') + 'h ' + duration.get('m') + 'm ' + duration.get('s') + 's';
}