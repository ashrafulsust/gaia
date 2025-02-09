# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

from marionette.by import By
from gaiatest.apps.base import Base
from gaiatest.apps.contacts.app import Contacts
from gaiatest.apps.messages.app import Messages


class NewMessage(Messages):

    _recipient_section_locator = (By.ID, 'messages-recipients-list')
    _receiver_input_locator = (By.CSS_SELECTOR, '#messages-recipients-list span.recipient')
    _add_recipient_button_locator = (By.ID, 'messages-contact-pick-button')
    _message_field_locator = (By.ID, 'messages-input')
    _send_message_button_locator = (By.ID, 'messages-send-button')
    _attach_button_locator = (By.ID, 'messages-attach-button')
    _options_button_locator = (By.ID, 'messages-options-button')
    _message_sending_locator = (By.CSS_SELECTOR, "li.message.outgoing.sending")
    _thread_messages_locator = (By.ID, 'thread-messages')
    _message_resize_notice_locator = (By.ID, 'messages-resize-notice')
    _subject_input_locator = (By.CSS_SELECTOR, '.subject-composer-input')
    _image_attachment_locator = (By.CSS_SELECTOR, '.attachment-container.preview')
    _recipients_locator = (By.CSS_SELECTOR, '#messages-recipients-list span')


    def __init__(self, marionette):
        Base.__init__(self, marionette)
        self.wait_for_condition(lambda m: self.apps.displayed_app.name == self.name)
        self.apps.switch_to_displayed_app()
        section = self.marionette.find_element(*self._thread_messages_locator)
        self.wait_for_condition(lambda m: section.location['x'] == 0)

    def type_phone_number(self, value):
        # tap on the parent element to activate editable
        self.marionette.find_element(*self._recipient_section_locator).tap()
        self.keyboard.send(value)

    def type_message(self, value):
        # change the focus to the message field to enable the send button
        self.wait_for_element_displayed(*self._message_field_locator)
        message_field = self.marionette.find_element(*self._message_field_locator)
        message_field.tap()
        self.keyboard.send(value)

    def tap_message(self):
        self.wait_for_element_displayed(*self._message_field_locator)
        message_field = self.marionette.find_element(*self._message_field_locator)
        message_field.tap()

    def tap_image_attachment(self):
        self.marionette.find_element(*self._image_attachment_locator).tap()
        from gaiatest.apps.messages.regions.attachment_options import AttachmentOptions
        return AttachmentOptions(self.marionette)

    def tap_send(self, timeout=120):
        self.wait_for_condition(lambda m: m.find_element(*self._send_message_button_locator).is_enabled())
        self.marionette.find_element(*self._send_message_button_locator).tap()
        self.wait_for_element_not_present(*self._message_sending_locator, timeout=timeout)
        from gaiatest.apps.messages.regions.message_thread import MessageThread
        return MessageThread(self.marionette)

    def tap_attachment(self):
        self.marionette.find_element(*self._attach_button_locator).tap()
        from gaiatest.apps.system.regions.activities import Activities
        return Activities(self.marionette)

    def tap_add_recipient(self):
        self.marionette.find_element(*self._add_recipient_button_locator).tap()
        contacts_app = Contacts(self.marionette)
        contacts_app.switch_to_contacts_frame()
        return contacts_app

    def tap_options(self):
        self.marionette.find_element(*self._options_button_locator).tap()
        from gaiatest.apps.messages.regions.activities import Activities
        return Activities(self.marionette)

    def wait_for_recipients_displayed(self):
        self.wait_for_element_displayed(*self._receiver_input_locator)

    def wait_for_resizing_to_finish(self):
        self.wait_for_element_not_displayed(*self._message_resize_notice_locator)

    def wait_for_subject_input_displayed(self):
        self.wait_for_element_displayed(*self._subject_input_locator)

    def wait_for_message_input_displayed(self):
        self.wait_for_element_displayed(*self._message_field_locator)

    @property
    def first_recipient_name(self):
        self.wait_for_element_displayed(*self._receiver_input_locator)
        return self.marionette.find_element(*self._receiver_input_locator).text

    @property
    def number_of_recipients(self):
        # we need to subtract one as the last element is the current editable element
        return len(self.marionette.find_elements(*self._receiver_input_locator)) - 1

    @property
    def recipient_css_class(self):
        return self.marionette.find_element(*self._receiver_input_locator).get_attribute('class')

    @property
    def is_recipient_name_editable(self):
        return self.marionette.find_element(*self._receiver_input_locator).get_attribute('contenteditable')

    @property
    def first_recipient_number_attribute(self):
        return self.marionette.find_element(*self._receiver_input_locator).get_attribute('data-number')

    def tap_recipient_section(self):
        self.marionette.find_element(*self._recipient_section_locator).tap()
        from gaiatest.apps.keyboard.app import Keyboard
        return Keyboard(self.marionette)

    @property
    def is_send_button_enabled(self):
        return self.marionette.find_element(*self._send_message_button_locator).is_enabled()

    @property
    def message(self):
        return self.marionette.find_element(*self._message_field_locator).text

    def tap_recipient_name(self):
        self.marionette.find_element(*self._receiver_input_locator).tap()

    @property
    def recipients(self):
        return self.marionette.find_elements(*self._recipients_locator)
