/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.dev/license
 */

import {
  Combobox,
  ComboboxInput,
  ComboboxPopup,
  ComboboxPopupContainer,
} from '@angular/aria/combobox';
import {Listbox, Option} from '@angular/aria/listbox';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  signal,
  viewChild,
  viewChildren,
} from '@angular/core';
import {OverlayModule} from '@angular/cdk/overlay';

interface Country {
  code: string;
  name: string;
}

/** @title Select with object values */
@Component({
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
  imports: [
    Combobox,
    ComboboxInput,
    ComboboxPopup,
    ComboboxPopupContainer,
    Listbox,
    Option,
    OverlayModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  /** The display text. */
  displayValue = signal('Select a country');

  /** The listbox popup. */
  listbox = viewChild<Listbox<Country>>(Listbox);

  /** The options available in the listbox. */
  options = viewChildren<Option<Country>>(Option);

  /** A reference to the combobox. */
  combobox = viewChild<Combobox<Country>>(Combobox);

  /** The country options. */
  countries: Country[] = [
    {code: 'US', name: 'United States'},
    {code: 'CA', name: 'Canada'},
    {code: 'MX', name: 'Mexico'},
    {code: 'GB', name: 'United Kingdom'},
    {code: 'FR', name: 'France'},
    {code: 'DE', name: 'Germany'},
    {code: 'JP', name: 'Japan'},
    {code: 'AU', name: 'Australia'},
  ];

  constructor() {
    // Updates the display value when the listbox values change.
    afterRenderEffect(() => {
      const values = this.listbox()?.values() || [];
      const displayValue = values.length ? values[0].name : 'Select a country';
      this.displayValue.set(displayValue);
    });

    // Scrolls to the active item when the active option changes.
    afterRenderEffect(() => {
      const option = this.options().find((opt) => opt.active());
      setTimeout(() => option?.element.scrollIntoView({block: 'nearest'}), 50);
    });

    // Resets the listbox scroll position when the combobox is closed.
    afterRenderEffect(() => {
      if (!this.combobox()?.expanded()) {
        setTimeout(() => this.listbox()?.element.scrollTo(0, 0), 150);
      }
    });
  }
}
