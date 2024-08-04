import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AutocompleteService {

  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) { }

  getCountries(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/autocomplete/countries`);
  }

  getCities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/autocomplete/cities`);
  }

  getUniversities(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/autocomplete/universities`);
  }

  getCurrencies(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/autocomplete/currencies`);
  }
}
