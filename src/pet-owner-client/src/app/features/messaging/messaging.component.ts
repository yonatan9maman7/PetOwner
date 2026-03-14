import { Component } from '@angular/core';

@Component({
  selector: 'app-messaging',
  standalone: true,
  template: `
    <div class="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <span class="text-6xl mb-6" aria-hidden="true">🐶💬</span>
      <h2 class="text-2xl font-bold text-gray-800 mb-2">Messages are coming soon!</h2>
      <p class="text-gray-500 max-w-md">
        We are currently building a real-time messaging system to help you
        connect seamlessly. Stay tuned for updates!
      </p>
    </div>
  `,
})
export class MessagingComponent {}
