import { Component, OnInit, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { CourseService } from '../../services/course/course.service';
import { Router } from '@angular/router';
import { CurrencyPipe } from '@angular/common';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  providers: [CurrencyPipe]
})
export class HomeComponent implements OnInit {
  displayedColumns: string[] = ['edit', 'delete', 'course_name', 'location', 'start_date', 'length', 'price'];
  dataSource: MatTableDataSource<any> = new MatTableDataSource();
  totalCourses: number = 0;
  pageSize: number = 10;
  filterText = '';

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  constructor(private router: Router, private courseService: CourseService, private currencyPipe: CurrencyPipe) {}

  ngOnInit() {
    this.loadCourses();
  }

  loadCourses(pageIndex: number = 0, pageSize: number = this.pageSize, filter: string = '') {
    this.courseService.getCourses(pageIndex, pageSize, filter).subscribe(response => {
      this.dataSource.data = response.data;
      this.totalCourses = response.total;
      this.dataSource.sort = this.sort;
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.loadCourses(0, this.pageSize, filterValue);
  }

  pageChanged(event: any) {
    this.loadCourses(event.pageIndex, event.pageSize, this.filterText.trim().toLowerCase());
  }

  addNewCourse() {
    this.router.navigate(['/add-course']);
  }
  
  editCourse(course: any) {
    this.router.navigate(['/edit-course', course._id]);
  }

  deleteCourse(courseId: string) {
    this.courseService.deleteCourse(courseId).subscribe(() => {
      this.loadCourses(this.paginator.pageIndex, this.paginator.pageSize, this.filterText.trim().toLowerCase());
    });
  }

  getLength(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const timeDiff = end.getTime() - start.getTime();
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  formatCurrency(price: number, currency: string): string {
    return this.currencyPipe.transform(price, currency, 'symbol', '1.2-2') || '';
  }

}
