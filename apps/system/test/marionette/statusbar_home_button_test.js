'use strict';

var Actions = require('marionette-client').Actions;

marionette('Closing statusbar via home button >', function() {

  var assert = require('assert');
  var System = require('./lib/system.js');

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1,
      'devtools.debugger.forbid-certified-apps': false
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var system = null,
      verticalHomeApp = 'app://verticalhome.gaiamobile.org',
      actions = new Actions(client);

  suiteSetup(function() {
    system = new System(client);
  });

  setup(function() {
    client.switchToFrame();
    system.waitForStartup();
  });

  function getScrollTop() {
    return client.executeScript(function() {
      return window.scrollY;
    });
  }

  function waitForHome() {
    system.waitForLaunch(verticalHomeApp);
    client.apps.switchToApp(verticalHomeApp);
  }

  test('Home screen keeps scroll position', function() {
    var height = client.executeScript(function() {
      return document.body.clientHeight;
    });

    // scroll vertical home screen
    var body = client.findElement('body');
    actions.flick(body, 0, height / 2, 0, 0)
           .perform();

    waitForHome();
    var lastScrollTop = getScrollTop();

    // pull down utility tray
    client.switchToFrame();
    actions.press(system.topPanel)
           .moveByOffset(0, height / 2)
           .release()
           .perform();

    // click home button
    system.tapHome();
    waitForHome();
    assert.ok(getScrollTop() === lastScrollTop);
  });
});
