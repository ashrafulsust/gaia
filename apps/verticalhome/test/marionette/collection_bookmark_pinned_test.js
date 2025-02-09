'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Collection = require('./lib/collection');
var Home2 = require('./lib/home2');
var EmeServer = require(
  '../../../../shared/test/integration/eme_server/parent');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Collection Pin Bookmark', function() {

  var client = marionette.client(Home2.clientOptions);
  var actions, bookmark, collection, home, selectors, server, system;

  suiteSetup(function(done) {
    EmeServer(client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function(done) {
    server.close(done);
  });

  var collectionIcon;

  // Hard-coded value from fixture.
  var bookmarkIdentifier = 'http://mozilla1.org/';

  setup(function() {
    actions = new Actions(client);
    bookmark = new Bookmark(client);
    selectors = Collection.Selectors;
    collection = new Collection(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    home.waitForLaunch();
    collection.disableGeolocation();
    EmeServer.setServerURL(client, server);

    // Create a collection
    var name = 'Around Me';
    collection.enterCreateScreen();
    collection.selectNew([name]);
    client.apps.switchToApp(Home2.URL);
    collectionIcon = collection.getCollectionByName(name);

    // Pin a result of the collection
    // helps marionette finding the icon: Bug 1046706
    home.moveIconToIndex(collectionIcon, 0);
    // Enter the created collection.
    collection.enterCollection(collectionIcon);
    collection.bookmark(bookmark, selectors.firstWebResultNoPinned);

    client.switchToFrame();
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('pins the bookmarked result', function() {
    var bookmarkIcon = home.getIcon(bookmarkIdentifier);
    // scrolling with APZC confuses marionette when tapping: Bug 1046706
    home.moveIconToIndex(bookmarkIcon, 1);

    actions.longPress(bookmarkIcon, 1).perform();
    client.helper.waitForElement(Home2.Selectors.editHeaderText);

    actions
      // Long tap the bookmark icon
      .press(bookmarkIcon)
      .wait(1)

      // Now drop the icon into the collection
      .move(collectionIcon)
      .release()
      .wait(1)
      .perform();

    // Exit edit mode.
    var done = client.helper.waitForElement(Home2.Selectors.editHeaderDone);
    done.click();

    collection.enterCollection(collectionIcon);

    var firstPinnedIcon = collection.firstPinnedResult;
    assert.equal(firstPinnedIcon.getAttribute('data-identifier'),
      bookmarkIdentifier);
  });
});
