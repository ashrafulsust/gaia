# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette import Wait
from marionette.by import By

from gaiatest.apps.base import Base
from gaiatest.apps.base import PageRegion
import urllib


class SearchPanel(Base):

    _search_results_app_frame_locator = (By.CSS_SELECTOR, '.searchWindow.active iframe')
    _search_results_locator = (By.CSS_SELECTOR, 'gaia-grid .icon')
    _search_suggestion_ok_button_locator = (By.ID, 'suggestions-notice-confirm')
    _rocketbar_input_locator = (By.ID, 'rocketbar-input')
    _search_results_offline_locator = (By.ID, 'offline-message')
    _search_results_offline_settings_locator = (By.ID, 'settings-connectivity')

    def _switch_to_search_results_frame(self):
        self.marionette.switch_to_frame()
        self.marionette.switch_to_frame(self.marionette.find_element(*self._search_results_app_frame_locator))

    @property
    def offline_search_message(self):
        return self.marionette.find_element(*self._search_results_offline_locator).text

    @property
    def is_offline_message_visible(self):
        return self.is_element_displayed(*self._search_results_offline_locator)

    def tap_offline_settings_button(self):
        self.marionette.find_element(*self._search_results_offline_settings_locator).tap()
        from gaiatest.apps.settings.app import Settings
        settings = Settings(self.marionette)
        settings.switch_to_settings_app()
        return settings

    def type_into_search_box(self, search_term):
        self.keyboard.send(search_term)
        # The search results frame is not findable with AppWindowManager
        self._switch_to_search_results_frame()

    def go_to_url(self, url):
        self.keyboard.send(url)

        #TODO Remove hack once Bug 1062309 is fixed
        self.marionette.switch_to_frame()
        self.wait_for_condition(lambda m: not self.keyboard.is_keyboard_displayed)

        self.marionette.find_element(*self._rocketbar_input_locator).tap()

        self.wait_for_condition(lambda m: self.keyboard.is_keyboard_displayed)
        self.keyboard.tap_enter()
        Wait(self.marionette).until(lambda m: urllib.quote(url, safe=':/?=&~') in self.apps.displayed_app.name)

        from gaiatest.apps.search.regions.browser import Browser
        return Browser(self.marionette)

    def wait_for_everything_me_results_to_load(self, minimum_expected_results=1):
        self.wait_for_condition(lambda m: len(m.find_elements(*self._search_results_locator))
                                          > minimum_expected_results)

    def confirm_suggestion_notice(self):
        self.wait_for_element_displayed(*self._search_suggestion_ok_button_locator)
        self.marionette.find_element(*self._search_suggestion_ok_button_locator).tap()
        self.wait_for_element_not_displayed(*self._search_suggestion_ok_button_locator)

    def _is_result_a_webapp(self, result_element):
        # An app result is to an installable (via marketplace) webapp
        return '.webapp' in result_element.get_attribute('data-identifier')

    @property
    def app_results(self):
        # An app result is to an installable (via marketplace) webapp
        return [self.Result(marionette=self.marionette, element=result)
                for result in self.marionette.find_elements(*self._search_results_locator)
                    if self._is_result_a_webapp(result)]

    @property
    def link_results(self):
        # A link result just opens a page in a frame
        return [self.Result(marionette=self.marionette, element=result)
                for result in self.marionette.find_elements(*self._search_results_locator)
                    if not self._is_result_a_webapp(result)]

    class Result(PageRegion):

        @property
        def name(self):
            return self.root_element.text

        def tap(self):
            app_name = self.name

            self.root_element.tap()
            # Wait for the displayed app to be that we have tapped
            self.wait_for_condition(lambda m: self.apps.displayed_app.name == app_name)
            self.apps.switch_to_displayed_app()

            # Wait for title to load (we cannot be more specific because the aut may change)
            self.wait_for_condition(lambda m: bool(m.title))
