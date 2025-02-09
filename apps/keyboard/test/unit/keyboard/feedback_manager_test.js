'use strict';

/* global VibrationFeedback, SoundFeedback, FeedbackManager,
          MockNavigatorMozSettings, MockNavigatorMozSettingsLock,
          SettingsPromiseManager */

require('/js/keyboard/feedback_manager.js');
require('/js/keyboard/settings.js');
require('/shared/test/unit/mocks/mock_event_target.js');
require('/shared/test/unit/mocks/mock_dom_request.js');
require('/shared/js/input_mgmt/mock_navigator_mozsettings.js');

suite('VibrationFeedback', function() {
  var realMozSettings;
  var feedback;
  var mozSettings;
  var lock;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();

    feedback = new VibrationFeedback({
      settingsPromiseManager: promiseManager
    });
    feedback.start();
  });

  suite('init with vibrate=true', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.vibration': true });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('vibrate', function() {
      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.isTrue(navigator.vibrate.calledOnce);
    });

    test('change to vibrate=false', function() {
      mozSettings.dispatchSettingChange('keyboard.vibration', false);

      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.equal(navigator.vibrate.calledOnce, false);
    });
  });

  suite('init with vibrate=false', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.vibration': false });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('vibrate', function() {
      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.equal(navigator.vibrate.calledOnce, false);
    });

    test('change to vibrate=true', function() {
      mozSettings.dispatchSettingChange('keyboard.vibration', true);

      this.sinon.stub(navigator, 'vibrate');

      feedback.triggerFeedback();
      assert.isTrue(navigator.vibrate.calledOnce);
    });
  });

  test('not ready -- don\'t vibrate', function() {
    this.sinon.stub(navigator, 'vibrate');

    feedback.triggerFeedback();
    assert.equal(navigator.vibrate.calledOnce, false);
  });
});

suite('SoundFeedback', function() {
  var realMozSettings;
  var feedback;
  var mozSettings;
  var lock;

  var normalTarget;
  var specialTarget;

  suiteSetup(function() {
    realMozSettings = navigator.mozSettings;
  });

  suiteTeardown(function() {
    navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var promiseManager = new SettingsPromiseManager();

    normalTarget = {
      keyCode: 60,
      isSpecialKey: false
    };

    specialTarget = {
      keyCode: 60,
      isSpecialKey: true
    };

    feedback = new SoundFeedback({
      settingsPromiseManager: promiseManager
    });
    feedback.start();
  });

  suite('init with sound=true', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.clicksound': true });
      var req1 = lock.get.getCall(1).returnValue;
      req1.fireSuccess({ 'audio.volume.notification': 10 });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('sound (normal key)', function() {
      var newAudio = {};
      this.sinon.stub(window, 'Audio').returns(newAudio);
      var clicker = feedback.clicker;
      this.sinon.stub(clicker, 'play');

      feedback.triggerFeedback(normalTarget);
      assert.isTrue(clicker.play.calledOnce);
      assert.equal(feedback.clicker, newAudio);
    });

    test('sound (special key)', function() {
      var newAudio = {};
      this.sinon.stub(window, 'Audio').returns(newAudio);
      var clicker = feedback.specialClicker;
      this.sinon.stub(clicker, 'play');

      feedback.triggerFeedback(specialTarget);
      assert.isTrue(clicker.play.calledOnce);
      assert.equal(feedback.specialClicker, newAudio);
    });

    test('change to sound=false', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', false);

      assert.equal(feedback.clicker, null, 'clicker should be dropped');
      assert.equal(feedback.specialClicker, null,
        'special clicker should be dropped');

      feedback.triggerFeedback(normalTarget);
      feedback.triggerFeedback(specialTarget);
    });
  });

  suite('init with sound=false', function() {
    setup(function(done) {
      var req = lock.get.getCall(0).returnValue;
      req.fireSuccess({ 'keyboard.clicksound': false });
      var req1 = lock.get.getCall(1).returnValue;
      req1.fireSuccess({ 'audio.volume.notification': 10 });

      feedback.settings.initSettings().then(function() {
      }).then(done, done);
    });

    test('sound (normal key)', function() {
      assert.equal(feedback.clicker, null, 'clicker should be dropped');

      feedback.triggerFeedback(normalTarget);
    });

    test('sound (special key)', function() {
      assert.equal(feedback.specialClicker, null,
        'special clicker should be dropped');

      feedback.triggerFeedback(specialTarget);
    });

    test('change to sound=true and sound (normal key)', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', true);

      var newAudio = {};
      this.sinon.stub(window, 'Audio').returns(newAudio);
      var clicker = feedback.clicker;
      this.sinon.stub(clicker, 'play');

      feedback.triggerFeedback(normalTarget);
      assert.isTrue(clicker.play.calledOnce);
      assert.equal(feedback.clicker, newAudio);
    });

    test('change to sound=true and sound (special key)', function() {
      mozSettings.dispatchSettingChange('keyboard.clicksound', true);

      var newAudio = {};
      this.sinon.stub(window, 'Audio').returns(newAudio);
      var clicker = feedback.specialClicker;
      this.sinon.stub(clicker, 'play');

      feedback.triggerFeedback(specialTarget);
      assert.isTrue(clicker.play.calledOnce);
      assert.equal(feedback.specialClicker, newAudio);
    });
  });
});

suite('FeedbackManager', function() {
  test('start, feedback, stop', function(done) {
    var mozSettings = navigator.mozSettings = new MockNavigatorMozSettings();
    var createLockStub = this.sinon.stub(mozSettings, 'createLock');
    var lock = new MockNavigatorMozSettingsLock();
    this.sinon.spy(lock, 'get');
    createLockStub.returns(lock);

    var normalTarget = {
      keyCode: 60,
      isSpecialKey: false
    };

    var specialTarget = {
      keyCode: 60,
      isSpecialKey: true
    };

    var app = {
      settingsPromiseManager: new SettingsPromiseManager()
    };

    var feedbackManager = new FeedbackManager(app);
    feedbackManager.start();

    var req = lock.get.getCall(0).returnValue;
    req.fireSuccess({ 'keyboard.vibration': true });
    var req1 = lock.get.getCall(1).returnValue;
    req1.fireSuccess({ 'keyboard.clicksound': true });
    var req2 = lock.get.getCall(2).returnValue;
    req2.fireSuccess({ 'audio.volume.notification': 10 });

    feedbackManager.soundFeedback.settings.initSettings().then(function() {
      this.sinon.stub(navigator, 'vibrate');
      var clicker = feedbackManager.soundFeedback.clicker;
      this.sinon.stub(clicker, 'play');
      var specialClicker = feedbackManager.soundFeedback.specialClicker;
      this.sinon.stub(specialClicker, 'play');

      feedbackManager.triggerFeedback(normalTarget);

      assert.isTrue(clicker.play.calledOnce);
      assert.isTrue(navigator.vibrate.calledOnce);

      feedbackManager.triggerFeedback(specialTarget);

      assert.isTrue(specialClicker.play.calledOnce);
      assert.isTrue(navigator.vibrate.calledTwice);

      feedbackManager.stop();
    }.bind(this)).then(done, done);
  });
});
