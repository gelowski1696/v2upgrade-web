import { DOCUMENT } from '@angular/common';
import { Component, DestroyRef, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-privacy-policy',
  templateUrl: './privacy-policy.component.html',
  styleUrl: './privacy-policy.component.css',
})
export class PrivacyPolicyComponent {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    const previousTitle = this.title.getTitle();
    const previousDescription = this.meta.getTag('name="description"')?.content;
    const previousRobots = this.meta.getTag('name="robots"')?.content;

    this.title.setTitle('Privacy Policy | VMJAM Sales');
    this.meta.updateTag({
      name: 'description',
      content:
        'How VMJAM Sales collects, uses, protects, and deletes information processed by Social Hub.',
    });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
    this.document.documentElement.classList.add('legal-page-active');

    this.destroyRef.onDestroy(() => {
      this.title.setTitle(previousTitle);
      this.meta.updateTag({
        name: 'description',
        content: previousDescription ?? 'Private VMJAM Sales owner dashboard.',
      });
      this.meta.updateTag({
        name: 'robots',
        content: previousRobots ?? 'noindex,nofollow,noarchive',
      });
      this.document.documentElement.classList.remove('legal-page-active');
    });
  }
}
