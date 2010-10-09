/**
 * Copyright 2009 RedHog, Egil Möller <egil.moller@piratpartiet.se>
 * Copyright 2010 Pita, Peter Martischka <petermartischka@googlemail.com>
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import("plugins.twitterStyleTags.models.tagQuery");

import("faststatic");
import("dispatch.{Dispatcher,PrefixMatcher,forward}");

import("etherpad.utils.*");
import("etherpad.collab.server_utils");
import("etherpad.globals.*");
import("etherpad.log");
import("etherpad.pad.padusers");
import("etherpad.pro.pro_utils");
import("etherpad.helpers");
import("etherpad.pro.pro_accounts.getSessionProAccount");
import("sqlbase.sqlbase");
import("sqlbase.sqlcommon");
import("sqlbase.sqlobj");
import("etherpad.pad.padutils");
import("fastJSON");


function onRequest() {
  var tags = tagQuery.queryToTags(request.params.query);
  var format = "html";
  if (request.params.format != undefined)
    format = request.params.format;
  var limit = 10;
  if (format == "sitemap")
    var limit = undefined;

  /* Create the pad filter sql */
  var querySql = tagQuery.getQueryToSql(tags.tags.concat(['public']), tags.antiTags);

  /* Use the pad filter sql to figure out which tags to show in the tag browser this time. */
  var queryNewTagsSql = tagQuery.newTagsSql(querySql);
  var newTags = sqlobj.executeRaw(queryNewTagsSql.sql, queryNewTagsSql.params);

  padSql = tagQuery.padInfoSql(querySql, limit);
  var matchingPads = sqlobj.executeRaw(padSql.sql, padSql.params);

  for (i = 0; i < matchingPads.length; i++) {
    matchingPads[i].TAGS = matchingPads[i].TAGS.split('#');
  }

  helpers.addClientVars({
   userAgent: request.headers["User-Agent"],
   debugEnabled: request.params.djs,
   clientIp: request.clientAddr,
   colorPalette: COLOR_PALETTE,
   serverTimestamp: +(new Date),
  });

  var info = {
    tags: tags.tags,
    antiTags: tags.antiTags,
    newTags: newTags,
    matchingPads: matchingPads
  };

  if (format == "json") {
    response.setContentType("application/json; charset=utf-8");
    response.write(fastJSON.stringify(info));
    if (request.acceptsGzip) {
      response.setGzip(true);
    }
  } else {
    info['tagQuery'] = tagQuery;
    info['config'] = appjet.config;
    info['padIdToReadonly'] = server_utils.padIdToReadonly;
    info['bodyClass'] = 'nonpropad';

    if (format == "html") {
      renderHtml("tagBrowser.ejs", info, ['twitterStyleTags']);
    } else if (format == "rss") {
      response.setContentType("application/xml; charset=utf-8");
      response.write(renderTemplateAsString("tagRss.ejs", info, ['twitterStyleTags']));
      if (request.acceptsGzip) {
	response.setGzip(true);
      }
    } else if (format == "sitemap") {
      response.setContentType("application/xml; charset=utf-8");
      response.write(renderTemplateAsString("tagSitemap.ejs", info, ['twitterStyleTags']));
      if (request.acceptsGzip) {
	response.setGzip(true);
      }
   } else {
     throw new Error("Unknown format " + format);
   }
  }
  return true;
}
