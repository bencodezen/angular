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

interface Label {
  value: string;
  icon: string;
}

/** @title Select with icons */
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
  /** The display text and icon. */
  displayValue = signal('Select a label');
  displayIcon = signal('');

  /** The listbox popup. */
  listbox = viewChild<Listbox<string>>(Listbox);

  /** The options available in the listbox. */
  options = viewChildren<Option<string>>(Option);

  /** A reference to the combobox. */
  combobox = viewChild<Combobox<string>>(Combobox);

  /** The label options with icons. */
  labels: Label[] = [
    {value: 'Important', icon: '⭐'},
    {value: 'Work', icon: '💼'},
    {value: 'Personal', icon: '👤'},
    {value: 'To Do', icon: '✓'},
    {value: 'Later', icon: '⏰'},
    {value: 'Travel', icon: '✈'},
  ];

  constructor() {
    // Updates the display value and icon when the listbox values change.
    afterRenderEffect(() => {
      const values = this.listbox()?.values() || [];
      if (values.length) {
        const selected = this.labels.find((l) => l.value === values[0]);
        this.displayValue.set(selected?.value || 'Select a label');
        this.displayIcon.set(selected?.icon || '');
      } else {
        this.displayValue.set('Select a label');
        this.displayIcon.set('');
      }
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
