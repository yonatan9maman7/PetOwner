import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div dir="ltr" lang="en" class="min-h-screen bg-white">
      <div class="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <a routerLink="/" class="inline-flex items-center text-sm text-indigo-600 hover:text-indigo-500 mb-8">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </a>

        <h1 class="text-3xl font-bold text-gray-900 mb-2">Terms of Use</h1>
        <p class="text-sm text-gray-500 mb-8">Last updated: March 2026</p>

        <div class="space-y-6 text-gray-700 leading-relaxed">
          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              By accessing or using the PetOwner platform, you agree to be bound by these Terms of Use.
              If you do not agree to all of these terms, you may not use our services.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">2. Description of Service</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              PetOwner provides an online platform connecting pet owners with pet care service providers.
              We facilitate the connection but are not a party to any agreement between users.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">3. User Accounts</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              You are responsible for maintaining the confidentiality of your account credentials
              and for all activities that occur under your account.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">4. User Conduct</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              You agree not to use the platform for any unlawful purpose or in any way that could
              damage, disable, or impair the service.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">5. Privacy Policy</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              Your use of the platform is also governed by our Privacy Policy, which is incorporated
              into these Terms by reference.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">6. Limitation of Liability</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              To the fullest extent permitted by law, PetOwner shall not be liable for any indirect,
              incidental, special, or consequential damages arising out of or in connection with your
              use of the platform.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">7. Modifications to Terms</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              We reserve the right to modify these Terms at any time. Continued use of the platform
              after changes constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 class="text-xl font-semibold text-gray-900 mb-3">8. Contact Information</h2>
            <p>
              <!-- CEO: paste paragraph from PDF here -->
              If you have any questions about these Terms, please contact us through the platform
              or at the email address provided on our website.
            </p>
          </section>
        </div>
      </div>
    </div>
  `,
})
export class TermsComponent {}
