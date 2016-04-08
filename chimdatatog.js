"use strict";
?
var Slack = require('slack-client');
var async = require('async');
var request = require('request');
var express = require('express');
var _ = require('lodash');
var slackTokens = {
	slk: 'xoxb-33202152964-WyrOBMfDRqvvf2GaKdYGpBxh',
};
?
var slacks = {};
var endpoint = process.env.ENDPOINT || 'https://magidex.com';
var autoReconnect = true;
var autoMark = true;
?
_.forEach(slackTokens, (slackToken, id) => {
	var slack = new Slack(slackToken, autoReconnect, autoMark);
	slacks[id] = slack;
	slack.on('open', () => {
	    console.log(`Connected to ${slack.team.name} as @${slack.self.name}`);
	});
?
	slack.on('message', (message) => {
		var text = message.text;
		var channel = slack.getChannelGroupOrDMByID(message.channel);
		var u = slack.users[message.user];
		if ( !u ) return;
		if ( u.is_bot ) return;
		var matches = [];
		var regex = /(\B)!([^! ][^!]*)/gi;
		var match = regex.exec(text);
		while (match) {
		    matches.push(match[2]);
		    match = regex.exec(text);
		}
		if ( matches.length >  0 ) console.log(text, matches);
		async.eachSeries(matches, function(m, callback) {
			console.log(id, '@' + u.name, ':', m);
			request({json: true, url: endpoint + '/api/irc?format=slack&q=' + encodeURIComponent(m)}, function (error, response, body) {
				if ( error ) return callback(error);
				if ( body && body.response && body.response.silent !== true ) {
					console.log(body.response);
					channel.postMessage({
						text: body.response,
						as_user: true,
						unfurl_links: false
					});
				} else {
					channel.send("Something bad happened >.>");
				}
				return callback(null);
			});
		});
?
	});
	 
	slack.on('error', (err) => {
	    console.error("Error", err);
	});
?
	slack.login();
});
var app = express();
app.get('/', function(req, res) {
	res.json(_.map(slacks, function(slack, id) {
		return {
			name: slack.self.name,
			team: slack.team.name
		};
	}));
});
?
?
app.listen(process.env.PORT || 3000);