import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Course {
  id?: number;
  university: string;
  city: string;
  country: string;
  coursename: string;
  coursedescription: string;
  startdate: Date;
  enddate: Date;
  price: number;
  currency: string;
}

@Injectable({
  providedIn: 'root'
})
export class CourseService {
  private apiUrl = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  getCourses(pageIndex: number, pageSize: number, filter: string): Observable<any> {
    const params = { page: pageIndex.toString(), size: pageSize.toString(), filter };
    return this.http.get<any>(`${this.apiUrl}/courses`, { params });
  }

  getCourseById(courseId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/courses/${courseId}`);
  }

  addCourse(course: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/courses`, course);
  }

  updateCourse(courseId: string, course: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/courses/${courseId}`, course);
  }

  deleteCourse(courseId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/courses/${courseId}`);
  }
}
