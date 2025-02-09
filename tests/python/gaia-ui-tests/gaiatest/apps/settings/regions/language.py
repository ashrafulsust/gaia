# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import time

from marionette.by import By
from gaiatest.apps.base import Base


class Language(Base):

    _select_language_locator = (By.CSS_SELECTOR, "select[name='language.current']")
    _language_options_locator = (By.CSS_SELECTOR, "select[name='language.current'] option")
    _header_locator = (By.CSS_SELECTOR, '.current gaia-header')
    _language_locator = (By.ID, 'languages')

    def wait_for_languages_to_load(self):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._language_options_locator)) > 0)

    def go_back(self, direction='ltr'):
        self.wait_for_element_displayed(*self._header_locator)
        header = self.marionette.find_element(*self._header_locator)
        # TODO: replace this condition with tap on the back button, after Bug 1061698 is fixed
        if direction == 'rtl':
            header.tap(x=header.size['width']-10)
        else:
            header.tap(x=header.size['width']-300)
        self.wait_for_condition(lambda m:
                                m.execute_script(
                                    "return window.wrappedJSObject.Settings && window.wrappedJSObject.Settings._currentPanel === '#root'"))

    def select_language(self, language):
        self.marionette.find_element(*self._select_language_locator).tap()
        self.select(language)

    @property
    def current_language(self):
        return self.marionette.find_element(By.CSS_SELECTOR, 'html').get_attribute('lang')

    def select(self, match_string):
        # This needs to be duplicated from base.py for a few reasons:
        # 1. When we return from the frame we don't return to the Settings app in its initial state,
        #    so the wait for in its launch method times out
        # 2. We need to use in instead of == on the match text because of the directional strings

        # have to go back to top level to get the B2G select box wrapper
        self.marionette.switch_to_frame()

        self.wait_for_condition(lambda m: len(self.marionette.find_elements(By.CSS_SELECTOR, '.value-selector-container li')) > 0)

        options = self.marionette.find_elements(By.CSS_SELECTOR, '.value-selector-container li')
        close_button = self.marionette.find_element(By.CSS_SELECTOR, 'button.value-option-confirm')

        # loop options until we find the match
        for li in options:
            if match_string in li.text:
                li.tap()
                break
        else:
            raise Exception("Element '%s' could not be found in select wrapper" % match_string)

        close_button.tap()
        self.wait_for_element_not_displayed(By.CSS_SELECTOR, 'button.value-option-confirm')

        # TODO we should find something suitable to wait for, but this goes too
        # fast against desktop builds causing intermittent failures
        time.sleep(0.2)

        # now back to app
        self.apps.switch_to_displayed_app()
