'use strict';

/* global MocksHelper */
/* global ModalDialog */
/* global MockL10n */
/* global MockLayoutManager */

requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_statusbar.js');
requireApp('system/test/unit/mock_layout_manager.js');
require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/js/modal_dialog.js');

var mocksForDialog = new MocksHelper([
  'StatusBar',
  'AppWindowManager'
]).init();

suite('system/ModalDialog >', function() {
  var stubById;
  var realL10n;
  var testObject = {
    dialogTitle: 'dialogTitle',
    dialogText: 'dialogText',
    dialogDefaultValue: 'dialogDefaultValue',
    dialogConfirmObject: {
      title: 'dialogConfirmTitle',
      callback: function() {}
    },
    dialogCancelObject: {
      title: 'dialogCancelTitle',
      callback: function() {}
    },
    fakeOrigin: 'http://settings.gaiamobile.org:8080'
  };

  mocksForDialog.attachTestHelpers();

  function ModalDialogCleanUp() {
    ModalDialog.currentEvents = {};
  }

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;

    window.layoutManager = new MockLayoutManager();

    stubById = sinon.stub(document, 'getElementById', function() {
      return document.createElement('div');
    });

    ModalDialog.init();
  });

  suiteTeardown(function() {
    stubById.restore();
    navigator.mozL10n = realL10n;
  });

  test('call buildSelectOneDialog >', function() {

    var testOptions = [
      {id: 'testId1', text: 'testText1'}
    ];

    ModalDialog.buildSelectOneDialog({
      title: 'testTitle',
      options: testOptions
    });

    assert.isNotNull(
      ModalDialog.elements.selectOneMenu.innerHTML.match(testOptions[0].id));
  });

  test('call selectone API directly >', function() {

    ModalDialog.selectOne({
      title: 'testTitle',
      options: [
        {id: 'testId1', text: 'searchName'}
      ]
    });

    assert.isTrue(ModalDialog.elements.selectOne.classList.contains('visible'));
    assert.isNull(
      ModalDialog.elements.selectOneTitle.innerHTML.match(
        testObject.dialogTitle));

    ModalDialogCleanUp();
  });

  test('call confirm API directly >', function() {

    ModalDialog.confirm(
      testObject.dialogTitle,
      testObject.dialogText,
      testObject.dialogConfirmObject,
      testObject.dialogCancelObject
    );

    assert.isTrue(ModalDialog.elements.confirm.classList.contains('visible'));
    assert.strictEqual(
      ModalDialog.elements.confirmTitle.getAttribute('data-l10n-id'),
      testObject.dialogTitle);
    assert.strictEqual(
      ModalDialog.elements.confirmMessage.getAttribute('data-l10n-id'),
      testObject.dialogText);

    ModalDialogCleanUp();
  });

  test('call alert API directly >', function() {
    ModalDialog.alert(
      testObject.dialogTitle,
      testObject.dialogText,
      testObject.dialogCancelObject
    );

    assert.isTrue(ModalDialog.elements.alert.classList.contains('visible'));
    assert.strictEqual(
      ModalDialog.elements.alertTitle.getAttribute('data-l10n-id'),
      testObject.dialogTitle);
    assert.strictEqual(
      ModalDialog.elements.alertMessage.getAttribute('data-l10n-id'),
      testObject.dialogText);

    ModalDialogCleanUp();
  });

  test('call prompt API directly >', function() {
    ModalDialog.prompt(
      testObject.dialogTitle,
      testObject.dialogText,
      testObject.dialogDefaultValue,
      testObject.dialogConfirmObject,
      testObject.dialogCancelObject
    );

    assert.isTrue(ModalDialog.elements.prompt.classList.contains('visible'));
    assert.strictEqual(
      ModalDialog.elements.promptTitle.getAttribute('data-l10n-id'),
      testObject.dialogTitle);
    assert.strictEqual(
      ModalDialog.elements.promptMessage.getAttribute('data-l10n-id'),
      testObject.dialogText);

    ModalDialogCleanUp();
  });

  suite('not to localize strings >', function() {
    var oldTestObject;
    suiteSetup(function() {
      oldTestObject = testObject;
      testObject.dialogText = { raw: testObject.dialogText };
    });

    suiteTeardown(function() {
      testObject = oldTestObject;
    });

    test('call confirm API directly >', function() {

      ModalDialog.confirm(
        testObject.dialogTitle,
        testObject.dialogText,
        testObject.dialogConfirmObject,
        testObject.dialogCancelObject
      );

      assert.strictEqual(
        ModalDialog.elements.confirmTitle.getAttribute('data-l10n-id'),
        testObject.dialogTitle);
      assert.strictEqual(
        ModalDialog.elements.confirmMessage.getAttribute('data-l10n-id'),
        null);
      assert.strictEqual(
        ModalDialog.elements.confirmMessage.textContent,
        testObject.dialogText.raw);

      ModalDialogCleanUp();
    });

    test('call alert API directly >', function() {
      ModalDialog.alert(
        testObject.dialogTitle,
        testObject.dialogText,
        testObject.dialogCancelObject
      );

      assert.strictEqual(
        ModalDialog.elements.alertTitle.getAttribute('data-l10n-id'),
        testObject.dialogTitle);
      assert.strictEqual(
        ModalDialog.elements.alertMessage.getAttribute('data-l10n-id'),
        null);
      assert.strictEqual(
        ModalDialog.elements.alertMessage.textContent,
        testObject.dialogText.raw);

      ModalDialogCleanUp();
    });

    test('call prompt API directly >', function() {
      ModalDialog.prompt(
        testObject.dialogTitle,
        testObject.dialogText,
        testObject.dialogDefaultValue,
        testObject.dialogConfirmObject,
        testObject.dialogCancelObject
      );

      assert.strictEqual(
        ModalDialog.elements.promptTitle.getAttribute('data-l10n-id'),
        testObject.dialogTitle);
      assert.strictEqual(
        ModalDialog.elements.promptMessage.getAttribute('data-l10n-id'),
        null);
      assert.strictEqual(
        ModalDialog.elements.promptMessage.textContent,
        testObject.dialogText.raw);

      ModalDialogCleanUp();
    });

    test('updateHeight on resize event and not visible', function() {
      ModalDialog.overlay.style.height = '';
      this.sinon.stub(ModalDialog, 'isVisible').returns(false);
      window.dispatchEvent(new CustomEvent('resize'));
      assert.ok(parseInt(ModalDialog.overlay.style.height, 10) > 0);
    });
  });
});
