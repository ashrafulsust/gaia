/* global MocksHelper, BaseModule, MockAppWindow, MockAttentionWindow */
'use strict';


requireApp('system/test/unit/mock_app_window.js');
requireApp('system/test/unit/mock_attention_window.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/hierarchy_manager.js');

var mocksForHierarchyManager = new MocksHelper([
  'LazyLoader'
]).init();

suite('system/HierarchyManager', function() {
  var subject;
  mocksForHierarchyManager.attachTestHelpers();

  var fakeAttentionWindowManager = {
    name: 'AttentionWindowManager',
    EVENT_PREFIX: 'attwm',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {}
  };
  var fakeAppWindowManager = {
    name: 'AppWindowManager',
    EVENT_PREFIX: 'awm',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {}
  };
  var fakeSystemDialogManager = {
    name: 'SystemDialogManager',
    EVENT_PREFIX: 'sdm',
    isActive: function() {},
    setHierarchy: function() {}
  };
  var fakeRocketbar = {
    name: 'Rocketbar',
    EVENT_PREFIX: 'rb',
    isActive: function() {},
    getActiveWindow: function() {},
    setHierarchy: function() {}
  };
  var fakeInitLogoHandler = {
    name: 'InitLogoHandler',
    EVENT_PREFIX: 'il',
    isActive: function() {},
    setHierarchy: function() {}
  };

  setup(function() {
    subject = BaseModule.instantiate('HierarchyManager');
    subject.start();
  });

  teardown(function() {
    subject.stop();
  });

  suite('Get top most window', function() {
    setup(function() {
      subject.registerHierarchy(fakeAppWindowManager);
      subject.registerHierarchy(fakeAttentionWindowManager);
    });

    teardown(function() {
      subject.unregisterHierarchy(fakeAppWindowManager);
      subject.unregisterHierarchy(fakeAttentionWindowManager);
    });

    test('Should get top most window instance ' +
         'if there is active window manager and it is having active window',
      function() {
        var fakeAppWindow = new MockAppWindow();
        this.sinon.stub(fakeAppWindowManager, 'getActiveWindow')
            .returns(fakeAppWindow);
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        assert.equal(subject.getTopMostWindow(), fakeAppWindow);

        var fakeAttentionWindow = new MockAttentionWindow();
        this.sinon.stub(fakeAttentionWindowManager, 'getActiveWindow')
            .returns(fakeAttentionWindow);
        this.sinon.stub(fakeAttentionWindowManager, 'isActive').returns(true);

        assert.equal(subject.getTopMostWindow(), fakeAttentionWindow);
      });

    test('Should get undefined if there is no active window manager',
      function() {
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(false);
        assert.isUndefined(subject.getTopMostWindow());
      });
  });

  suite('Update Hierarchy', function() {
    setup(function() {
      subject.registerHierarchy(fakeAppWindowManager);
      subject.registerHierarchy(fakeSystemDialogManager);
      subject.registerHierarchy(fakeRocketbar);
    });

    teardown(function() {
      subject.unregisterHierarchy(fakeAppWindowManager);
      subject.unregisterHierarchy(fakeSystemDialogManager);
      subject.unregisterHierarchy(fakeRocketbar);
    });

    test('-activated/-activating/-deactivating/-deactivated',
      function() {
        subject.registerHierarchy(fakeInitLogoHandler);
        var stubILisActive = this.sinon.stub(fakeInitLogoHandler, 'isActive');
        stubILisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeInitLogoHandler.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeInitLogoHandler);
        subject.unregisterHierarchy(fakeInitLogoHandler);
        assert.isNull(subject.getTopMostUI());

        var stubAWMisActive = this.sinon.stub(fakeAppWindowManager, 'isActive');
        stubAWMisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeAppWindowManager);

        stubAWMisActive.returns(false);
        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-deactivated'));
        assert.isNull(subject.getTopMostUI());

        var stubRBisActive = this.sinon.stub(fakeRocketbar, 'isActive');
        stubRBisActive.returns(true);
        window.dispatchEvent(
          new CustomEvent(fakeRocketbar.EVENT_PREFIX + '-activated'));

        assert.equal(subject.getTopMostUI(), fakeRocketbar);
        stubAWMisActive.returns(true);

        window.dispatchEvent(
          new CustomEvent(fakeAppWindowManager.EVENT_PREFIX + '-activated'));
        assert.equal(subject.getTopMostUI(), fakeRocketbar);

        stubRBisActive.returns(false);
        window.dispatchEvent(
          new CustomEvent(fakeRocketbar.EVENT_PREFIX + '-deactivated'));
        assert.equal(subject.getTopMostUI(), fakeAppWindowManager);
      });
  });

  suite('focus request', function() {
    test('should not focus when lower priority module ' +
      'requests to be focused', function() {
        this.sinon.stub(fakeAppWindowManager, 'setHierarchy');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
        subject.registerHierarchy(fakeAppWindowManager);
        subject.registerHierarchy(fakeSystemDialogManager);
        subject.focus(fakeAppWindowManager);
        assert.isTrue(fakeAppWindowManager.setHierarchy.calledWith(false));
      });

    test('should focus when higher priority module requests to be focused',
      function() {
        this.sinon.stub(fakeSystemDialogManager, 'setHierarchy');
        this.sinon.stub(fakeAppWindowManager, 'isActive').returns(true);
        this.sinon.stub(fakeSystemDialogManager, 'isActive').returns(true);
        subject.registerHierarchy(fakeAppWindowManager);
        subject.registerHierarchy(fakeSystemDialogManager);
        subject.focus(fakeSystemDialogManager);
        assert.isTrue(fakeSystemDialogManager.setHierarchy.calledWith(true));
      });
  });

  suite('unregisterHierarchy', function() {
    test('unwatch the hierarchy',
      function() {
        subject.registerHierarchy(fakeAppWindowManager);
        subject.unregisterHierarchy(fakeAppWindowManager);
        assert.equal(subject._ui_list.length, 0);
      });
  });

  suite('registerHierarchy', function() {
    test('Should update _ui_list and call updateHierarchy when registering',
      function() {
        this.sinon.stub(subject, 'updateHierarchy');
        subject.registerHierarchy(fakeAppWindowManager);
        assert.equal(subject._ui_list.length, 1);
        assert.isTrue(subject.updateHierarchy.calledOnce);

        subject.registerHierarchy(fakeSystemDialogManager);
        assert.equal(subject._ui_list.length, 2);
        assert.isTrue(subject.updateHierarchy.calledTwice);

        subject.registerHierarchy(fakeRocketbar);
        assert.equal(subject._ui_list.length, 3);
        assert.isTrue(subject.updateHierarchy.calledThrice);
      });
  });
});
