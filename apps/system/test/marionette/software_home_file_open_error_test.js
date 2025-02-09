'use strict';

var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var Rocketbar = require('./lib/rocketbar');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Server = require('../../../../shared/test/integration/server');
var System = require('./lib/system');
var Actions = require('marionette-client').Actions;
var assert = require('chai').assert;

marionette('Software Home Button - File Open Error', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    }
  });
  var home, rocketbar, search, server, system, actions;

  setup(function() {
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    actions = new Actions(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  test('Proper layout for file error dialog', function() {
    var url = server.url('invalid_file.html');

    // Navigate to the url.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    // Save the file.
    actions.longPress(client.helper.waitForElement('a'), 1).perform();
    client.switchToFrame();
    system.appContextMenuSaveLink.click();

    // Tap on the toaster to open the download.
    // We could also open this from settings or the utility tray if needed.
    var toasterTitle;
    client.waitFor(function() {
      toasterTitle = client.helper.waitForElement(
        '#notification-toaster.displayed .toaster-title');
      return toasterTitle.text().indexOf('Download complete') !== -1;
    });
    toasterTitle.tap();

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var dialogHeight = system.downloadDialog.size().height;
    var shbRect = system.softwareButtons.scriptWith(rect);

    assert.equal(dialogHeight, expectedDialogHeight());
    assert.equal(dialogHeight, shbRect.top);
  });

  function expectedDialogHeight() {
    var winHeight = client.findElement('body').size().height;
    var shbHeight = system.softwareButtons.size().height;
    return (winHeight - shbHeight);
  }
});
