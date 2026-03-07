import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface UploadResult {
  fileName: string;
  url: string;
  thumbnailUrl: string | null;
  sizeBytes: number;
}

@Injectable({ providedIn: 'root' })
export class FileUploadService {
  private readonly http = inject(HttpClient);

  uploadImage(file: File, folder = 'images'): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResult>(`/api/files/upload/image?folder=${folder}`, formData);
  }

  uploadDocument(file: File, folder = 'documents'): Observable<UploadResult> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResult>(`/api/files/upload/document?folder=${folder}`, formData);
  }

  delete(blobName: string): Observable<void> {
    return this.http.delete<void>(`/api/files/${blobName}`);
  }

  getSasUrl(blobName: string): Observable<{ url: string }> {
    return this.http.get<{ url: string }>(`/api/files/sas/${blobName}`);
  }
}
