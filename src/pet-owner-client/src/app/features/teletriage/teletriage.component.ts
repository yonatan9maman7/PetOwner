import { Component, inject, OnInit, signal, computed, ElementRef, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { Pet, PetService } from '../../services/pet.service';
import { TeletriageService, TeletriageResponse, TeletriageHistory, NearbyVet } from '../../services/teletriage.service';
import { ToastService } from '../../services/toast.service';

type ChatRole = 'user' | 'assistant' | 'system';

interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: Date;
  assessment?: TeletriageResponse;
  imagePreview?: string;
}

@Component({
  selector: 'app-teletriage',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex flex-col">

      <!-- Header -->
      <div class="bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div class="max-w-2xl mx-auto flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div class="flex-1">
            <h1 class="text-lg font-bold text-slate-900">Pet Health Triage</h1>
            <p class="text-xs text-slate-500">AI-powered preliminary health assessment</p>
          </div>

          @if (!showHistory()) {
            <button
              (click)="toggleHistory()"
              class="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              History
            </button>
          } @else {
            <button
              (click)="toggleHistory()"
              class="text-sm text-slate-600 hover:text-slate-700 font-medium flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          }
        </div>
      </div>

      @if (showHistory()) {
        <!-- History View -->
        <div class="flex-1 overflow-y-auto px-4 py-6">
          <div class="max-w-2xl mx-auto space-y-3">
            @if (historyLoading()) {
              <div class="flex justify-center py-12">
                <svg class="w-8 h-8 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                </svg>
              </div>
            } @else if (historyItems().length === 0) {
              <div class="text-center py-16 text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p class="font-medium">No assessment history</p>
                <p class="text-sm mt-1">Run your first triage to see results here</p>
              </div>
            } @else {
              @for (item of historyItems(); track item.id) {
                <button
                  (click)="loadHistoryItem(item)"
                  class="w-full text-left bg-white rounded-xl border border-gray-200 p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-1">
                        <span class="text-xs font-semibold px-2 py-0.5 rounded-full" [class]="severityBadgeClass(item.severity)">
                          {{ item.severity }}
                        </span>
                        @if (item.isEmergency) {
                          <span class="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Emergency</span>
                        }
                        <span class="text-xs text-slate-400">{{ item.petName }}</span>
                      </div>
                      <p class="text-sm text-slate-700 truncate">{{ item.symptoms }}</p>
                      <p class="text-xs text-slate-400 mt-1">{{ item.createdAt | date:'medium' }}</p>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-slate-300 flex-shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </button>
              }
            }
          </div>
        </div>
      } @else {
        <!-- Chat View -->
        <div class="flex-1 overflow-y-auto px-4 py-6" #chatContainer>
          <div class="max-w-2xl mx-auto space-y-4">

            @if (messages().length === 0 && !selectedPet()) {
              <!-- Pet Selection -->
              <div class="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div class="flex items-center gap-2 mb-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <span class="text-sm font-semibold text-slate-700">Pet Health Assistant</span>
                </div>
                <p class="text-sm text-slate-600 mb-4">
                  Which pet are you concerned about? Select one to start the health assessment.
                </p>

                @if (petsLoading()) {
                  <div class="flex justify-center py-4">
                    <svg class="w-6 h-6 animate-spin text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  </div>
                } @else if (pets().length === 0) {
                  <div class="text-center py-4 text-slate-400">
                    <p class="text-sm">No pets found. Add a pet first from the My Pets page.</p>
                  </div>
                } @else {
                  <div class="grid gap-2">
                    @for (pet of pets(); track pet.id) {
                      <button
                        (click)="selectPet(pet)"
                        class="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all text-left"
                      >
                        <div class="w-10 h-10 rounded-full flex items-center justify-center text-lg" [class]="speciesAvatarClass(pet.species)">
                          {{ speciesEmoji(pet.species) }}
                        </div>
                        <div>
                          <p class="font-medium text-slate-800 text-sm">{{ pet.name }}</p>
                          <p class="text-xs text-slate-400">{{ pet.species }} · {{ pet.age }} {{ pet.age === 1 ? 'year' : 'years' }} old</p>
                        </div>
                      </button>
                    }
                  </div>
                }
              </div>
            }

            @if (selectedPet() && messages().length === 0) {
              <!-- Welcome message after pet selection -->
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div class="bg-white rounded-2xl rounded-tl-md shadow-sm border border-gray-100 p-4 max-w-[85%]">
                  <p class="text-sm text-slate-700">
                    I'm ready to help assess <strong>{{ selectedPet()!.name }}</strong>'s health.
                    Please describe the symptoms you've noticed — be as specific as possible about what's happening, when it started, and any changes in behavior.
                  </p>
                  <p class="text-xs text-slate-400 mt-2">
                    This is a preliminary AI assessment and does not replace professional veterinary care.
                  </p>
                </div>
              </div>
            }

            <!-- Chat Messages -->
            @for (msg of messages(); track $index) {
              @if (msg.role === 'user') {
                <div class="flex justify-end">
                  <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-md px-4 py-3 max-w-[85%] shadow-sm">
                    @if (msg.imagePreview) {
                      <img [src]="msg.imagePreview" alt="Attached photo" class="w-32 h-32 object-cover rounded-lg mb-2 border border-indigo-400/30" />
                    }
                    <p class="text-sm whitespace-pre-wrap">{{ msg.content }}</p>
                    <p class="text-xs text-indigo-200 mt-1 text-right">{{ msg.timestamp | date:'shortTime' }}</p>
                  </div>
                </div>
              } @else if (msg.assessment) {
                <!-- Assessment Card -->
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class="max-w-[90%] space-y-3">
                    <!-- Emergency Banner with Action Buttons -->
                    @if (msg.assessment.isEmergency) {
                      <div class="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
                        <div class="flex items-start gap-3">
                          <div class="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                            </svg>
                          </div>
                          <div>
                            <p class="font-bold text-red-800 text-sm">Emergency — Seek Immediate Veterinary Care</p>
                            <p class="text-xs text-red-600 mt-1">This assessment suggests your pet may need urgent attention. Please contact a veterinarian immediately.</p>
                          </div>
                        </div>
                        <div class="flex gap-2 pl-[52px]">
                          <a
                            href="tel:911"
                            class="inline-flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-lg hover:bg-red-700 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call Emergency Services
                          </a>
                          <a
                            href="https://www.google.com/maps/search/emergency+veterinary+clinic+near+me"
                            target="_blank"
                            class="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-red-300 text-red-700 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            Find Emergency Vet
                          </a>
                        </div>
                      </div>
                    }

                    <!-- Severity & Assessment -->
                    <div class="bg-white rounded-2xl rounded-tl-md shadow-sm border border-gray-100 overflow-hidden">
                      <!-- Severity Header -->
                      <div class="px-4 py-3 border-b border-gray-100 flex items-center gap-2" [class]="severityHeaderClass(msg.assessment.severity)">
                        <div class="w-3 h-3 rounded-full" [class]="severityDotClass(msg.assessment.severity)"></div>
                        <span class="text-sm font-semibold">Severity: {{ msg.assessment.severity }}</span>
                      </div>

                      <!-- Assessment Body -->
                      <div class="p-4 space-y-3">
                        <div>
                          <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Assessment</p>
                          <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ msg.assessment.assessment }}</p>
                        </div>
                        @if (msg.assessment.recommendations) {
                          <div>
                            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Recommendations</p>
                            <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ msg.assessment.recommendations }}</p>
                          </div>
                        }
                      </div>

                      <!-- Footer -->
                      <div class="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                        <span class="text-xs text-slate-400">{{ msg.timestamp | date:'medium' }}</span>
                        <span class="text-xs text-slate-400">AI Assessment</span>
                      </div>
                    </div>

                    <!-- Disclaimer -->
                    <p class="text-xs text-slate-400 px-1">
                      This is a preliminary AI assessment. Always consult a licensed veterinarian for accurate diagnosis and treatment.
                    </p>
                  </div>
                </div>
              } @else {
                <!-- Regular assistant message -->
                <div class="flex gap-3">
                  <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </div>
                  <div class="bg-white rounded-2xl rounded-tl-md shadow-sm border border-gray-100 p-4 max-w-[85%]">
                    <p class="text-sm text-slate-700 whitespace-pre-wrap">{{ msg.content }}</p>
                    <p class="text-xs text-slate-400 mt-1">{{ msg.timestamp | date:'shortTime' }}</p>
                  </div>
                </div>
              }
            }

            <!-- Typing Indicator -->
            @if (assessing()) {
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <div class="bg-white rounded-2xl rounded-tl-md shadow-sm border border-gray-100 px-4 py-3">
                  <div class="flex items-center gap-2">
                    <div class="flex gap-1">
                      <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                      <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                      <div class="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                    </div>
                    <span class="text-xs text-slate-400">Analyzing symptoms{{ messages().at(-1)?.imagePreview ? ' & photo' : '' }}...</span>
                  </div>
                </div>
              </div>
            }

            <!-- Nearby Vets Section -->
            @if (nearbyVetsLoading()) {
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="bg-white rounded-2xl rounded-tl-md shadow-sm border border-gray-100 px-4 py-3">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 animate-spin text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                    <span class="text-xs text-slate-400">Finding nearby pet care providers...</span>
                  </div>
                </div>
              </div>
            }

            @if (nearbyVets().length > 0) {
              <div class="flex gap-3">
                <div class="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div class="max-w-[90%] space-y-2">
                  <p class="text-xs font-semibold text-emerald-700 px-1">Nearby Pet Care Providers</p>
                  @for (vet of nearbyVets(); track vet.providerId) {
                    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-3 hover:border-emerald-300 transition-colors">
                      <div class="flex items-start gap-3">
                        <div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          @if (vet.profileImageUrl) {
                            <img [src]="vet.profileImageUrl" class="w-full h-full object-cover" [alt]="vet.name" />
                          } @else {
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          }
                        </div>
                        <div class="flex-1 min-w-0">
                          <div class="flex items-center gap-2">
                            <p class="text-sm font-semibold text-slate-800 truncate">{{ vet.name }}</p>
                            @if (vet.averageRating > 0) {
                              <span class="text-xs text-amber-600 flex items-center gap-0.5 flex-shrink-0">
                                <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                                {{ vet.averageRating.toFixed(1) }}
                              </span>
                            }
                          </div>
                          <p class="text-xs text-slate-500">{{ vet.services }}</p>
                          <p class="text-xs text-slate-400 mt-0.5">{{ vet.distanceKm.toFixed(1) }} km away</p>
                          @if (vet.address) {
                            <p class="text-xs text-slate-400 truncate">{{ vet.address }}</p>
                          }
                        </div>
                      </div>
                      <div class="flex gap-2 mt-2 pl-[52px]">
                        @if (vet.phone) {
                          <a
                            [href]="'tel:' + vet.phone"
                            class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-lg hover:bg-emerald-100 transition-colors"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                              <path stroke-linecap="round" stroke-linejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            Call
                          </a>
                        }
                        <button
                          (click)="openInMaps(vet.latitude, vet.longitude, vet.name)"
                          class="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-50 text-blue-700 text-xs font-medium rounded-lg hover:bg-blue-100 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Directions
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          </div>
        </div>

        <!-- Input Area -->
        @if (selectedPet()) {
          <div class="border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
            <div class="max-w-2xl mx-auto">
              <!-- New Assessment / Change Pet buttons -->
              @if (messages().length > 0 && !assessing()) {
                <div class="flex gap-2 mb-3">
                  <button
                    (click)="startNewAssessment()"
                    class="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition-colors font-medium"
                  >
                    New assessment
                  </button>
                  <button
                    (click)="changePet()"
                    class="text-xs px-3 py-1.5 bg-gray-100 text-slate-600 rounded-full hover:bg-gray-200 transition-colors font-medium"
                  >
                    Change pet
                  </button>
                </div>
              }

              @if (attachedImagePreview()) {
                <div class="flex items-center gap-2 mb-2 px-1">
                  <div class="relative group">
                    <img [src]="attachedImagePreview()!" alt="Attached" class="w-14 h-14 object-cover rounded-lg border border-gray-200 shadow-sm" />
                    <button
                      type="button"
                      (click)="removeAttachedImage()"
                      class="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-slate-700 text-white flex items-center justify-center text-xs hover:bg-red-600 transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                      aria-label="Remove photo"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <span class="text-xs text-slate-400">Photo attached</span>
                </div>
              }

              <input type="file" accept="image/*" (change)="onFileSelected($event)" class="hidden" #fileInput />

              <form (ngSubmit)="submitSymptoms()" class="flex items-end gap-2">
                <button
                  type="button"
                  (click)="fileInput.click()"
                  [disabled]="assessing()"
                  class="flex-shrink-0 w-10 h-10 rounded-xl border border-gray-300 text-slate-500 flex items-center justify-center hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                  title="Attach a photo"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.75">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <div class="flex-1 relative">
                  <textarea
                    [(ngModel)]="symptomInput"
                    name="symptoms"
                    placeholder="Describe the symptoms you've noticed..."
                    rows="1"
                    class="w-full resize-none rounded-xl border border-gray-300 px-4 py-3 pr-12 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-shadow"
                    [disabled]="assessing()"
                    (keydown.enter)="onEnterKey($event)"
                    (input)="autoResize($event)"
                    #textareaEl
                  ></textarea>
                </div>
                <button
                  type="submit"
                  [disabled]="assessing() || !symptomInput().trim()"
                  class="flex-shrink-0 w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 19V5m0 0l-7 7m7-7l7 7" />
                  </svg>
                </button>
              </form>
            </div>
          </div>
        }
      }
    </div>
  `,
})
export class TeletriageComponent implements OnInit {
  private readonly petService = inject(PetService);
  private readonly triageService = inject(TeletriageService);
  private readonly toast = inject(ToastService);

  pets = signal<Pet[]>([]);
  petsLoading = signal(true);
  selectedPet = signal<Pet | null>(null);
  messages = signal<ChatMessage[]>([]);
  symptomInput = signal('');
  assessing = signal(false);

  showHistory = signal(false);
  historyItems = signal<TeletriageHistory[]>([]);
  historyLoading = signal(false);

  attachedImageBase64 = signal<string | null>(null);
  attachedImagePreview = signal<string | null>(null);

  nearbyVets = signal<NearbyVet[]>([]);
  nearbyVetsLoading = signal(false);
  userLocation = signal<{ lat: number; lng: number } | null>(null);

  @ViewChild('chatContainer') chatContainer?: ElementRef<HTMLElement>;

  ngOnInit(): void {
    this.loadPets();
    this.requestUserLocation();
  }

  private requestUserLocation(): void {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => this.userLocation.set({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {}
      );
    }
  }

  private loadPets(): void {
    this.petsLoading.set(true);
    this.petService.getAll().subscribe({
      next: (pets) => {
        this.pets.set(pets);
        this.petsLoading.set(false);
      },
      error: () => {
        this.toast.show('Failed to load pets', 'error');
        this.petsLoading.set(false);
      },
    });
  }

  selectPet(pet: Pet): void {
    this.selectedPet.set(pet);
    this.messages.set([]);
  }

  submitSymptoms(): void {
    const symptoms = this.symptomInput().trim();
    const pet = this.selectedPet();
    if (!symptoms || !pet || this.assessing()) return;

    const imageBase64 = this.attachedImageBase64() ?? undefined;
    const imagePreview = this.attachedImagePreview() ?? undefined;

    const userMsg: ChatMessage = {
      role: 'user',
      content: symptoms,
      timestamp: new Date(),
      imagePreview,
    };
    this.messages.update((msgs) => [...msgs, userMsg]);
    this.symptomInput.set('');
    this.attachedImageBase64.set(null);
    this.attachedImagePreview.set(null);
    this.assessing.set(true);
    this.scrollToBottom();

    this.triageService.assess(pet.id, symptoms, imageBase64).subscribe({
      next: (result) => {
        const assessmentMsg: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date(),
          assessment: result,
        };
        this.messages.update((msgs) => [...msgs, assessmentMsg]);
        this.assessing.set(false);
        this.scrollToBottom();

        if (result.isEmergency || result.severity === 'High' || result.severity === 'Critical') {
          this.fetchNearbyVets();
        }
      },
      error: () => {
        const errorMsg: ChatMessage = {
          role: 'assistant',
          content: 'Sorry, I was unable to complete the assessment. Please try again or consult a veterinarian directly.',
          timestamp: new Date(),
        };
        this.messages.update((msgs) => [...msgs, errorMsg]);
        this.assessing.set(false);
        this.toast.show('Assessment failed', 'error');
        this.scrollToBottom();
      },
    });
  }

  onEnterKey(event: Event): void {
    const kbEvent = event as KeyboardEvent;
    if (!kbEvent.shiftKey) {
      kbEvent.preventDefault();
      this.submitSymptoms();
    }
  }

  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.toast.show('Please select an image file', 'error');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.toast.show('Image must be under 5 MB', 'error');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      this.attachedImagePreview.set(dataUrl);
      const base64 = dataUrl.split(',')[1];
      this.attachedImageBase64.set(base64);
    };
    reader.readAsDataURL(file);
    input.value = '';
  }

  removeAttachedImage(): void {
    this.attachedImageBase64.set(null);
    this.attachedImagePreview.set(null);
  }

  startNewAssessment(): void {
    this.messages.set([]);
    this.symptomInput.set('');
    this.attachedImageBase64.set(null);
    this.attachedImagePreview.set(null);
    this.nearbyVets.set([]);
  }

  changePet(): void {
    this.selectedPet.set(null);
    this.messages.set([]);
    this.symptomInput.set('');
    this.attachedImageBase64.set(null);
    this.attachedImagePreview.set(null);
    this.nearbyVets.set([]);
  }

  private fetchNearbyVets(): void {
    const loc = this.userLocation();
    if (!loc) return;

    this.nearbyVetsLoading.set(true);
    this.triageService.getNearbyVets(loc.lat, loc.lng).subscribe({
      next: (vets) => {
        this.nearbyVets.set(vets);
        this.nearbyVetsLoading.set(false);
        this.scrollToBottom();
      },
      error: () => {
        this.nearbyVetsLoading.set(false);
      },
    });
  }

  openInMaps(lat: number, lng: number, name: string): void {
    window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}&query_place_id=${encodeURIComponent(name)}`, '_blank');
  }

  toggleHistory(): void {
    const opening = !this.showHistory();
    this.showHistory.set(opening);

    if (opening) {
      this.loadAllHistory();
    }
  }

  private loadAllHistory(): void {
    const allPets = this.pets();
    if (allPets.length === 0) {
      this.historyItems.set([]);
      return;
    }

    this.historyLoading.set(true);
    let completed = 0;
    const allItems: TeletriageHistory[] = [];

    for (const pet of allPets) {
      this.triageService.getHistory(pet.id).subscribe({
        next: (items) => {
          allItems.push(...items);
          completed++;
          if (completed === allPets.length) {
            allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.historyItems.set(allItems);
            this.historyLoading.set(false);
          }
        },
        error: () => {
          completed++;
          if (completed === allPets.length) {
            allItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            this.historyItems.set(allItems);
            this.historyLoading.set(false);
          }
        },
      });
    }
  }

  loadHistoryItem(item: TeletriageHistory): void {
    const pet = this.pets().find((p) => p.id === item.petId);
    if (pet) this.selectedPet.set(pet);

    const msgs: ChatMessage[] = [
      { role: 'user', content: item.symptoms, timestamp: new Date(item.createdAt) },
      {
        role: 'assistant',
        content: '',
        timestamp: new Date(item.createdAt),
        assessment: {
          id: item.id,
          petId: item.petId,
          petName: item.petName,
          severity: item.severity,
          assessment: item.assessment,
          recommendations: item.recommendations,
          isEmergency: item.isEmergency,
          createdAt: item.createdAt,
        },
      },
    ];
    this.messages.set(msgs);
    this.showHistory.set(false);
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      this.chatContainer?.nativeElement.scrollTo({
        top: this.chatContainer.nativeElement.scrollHeight,
        behavior: 'smooth',
      });
    }, 100);
  }

  speciesEmoji(species: string): string {
    switch (species?.toLowerCase()) {
      case 'dog': return '\uD83D\uDC36';
      case 'cat': return '\uD83D\uDC31';
      default: return '\uD83D\uDC3E';
    }
  }

  speciesAvatarClass(species: string): string {
    switch (species?.toLowerCase()) {
      case 'dog': return 'bg-amber-100';
      case 'cat': return 'bg-purple-100';
      default: return 'bg-emerald-100';
    }
  }

  severityBadgeClass(severity: string): string {
    switch (severity) {
      case 'Low': return 'bg-green-100 text-green-700';
      case 'Medium': return 'bg-yellow-100 text-yellow-700';
      case 'High': return 'bg-orange-100 text-orange-700';
      case 'Critical': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  severityHeaderClass(severity: string): string {
    switch (severity) {
      case 'Low': return 'bg-green-50';
      case 'Medium': return 'bg-yellow-50';
      case 'High': return 'bg-orange-50';
      case 'Critical': return 'bg-red-50';
      default: return 'bg-gray-50';
    }
  }

  severityDotClass(severity: string): string {
    switch (severity) {
      case 'Low': return 'bg-green-500';
      case 'Medium': return 'bg-yellow-500';
      case 'High': return 'bg-orange-500';
      case 'Critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
}
