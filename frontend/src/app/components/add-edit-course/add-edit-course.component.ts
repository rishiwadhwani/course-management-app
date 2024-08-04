import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CourseService } from '../../services/course/course.service';
import { Observable, map, startWith } from 'rxjs';
import { AutocompleteService } from '../../services/autocomplete/autocomplete.service';

@Component({
  selector: 'app-add-edit-course',
  templateUrl: './add-edit-course.component.html',
  styleUrls: ['./add-edit-course.component.scss']
})
export class AddEditCourseComponent implements OnInit {
  courseForm: FormGroup;
  isEditMode: boolean = false;
  courseId: string | null = null;
  
  universities: string[] = [];
  cities: string[] = [];
  countries: string[] = [];
  currencies: string[] = [];

  filteredUniversities!: Observable<string[]>;
  filteredCities!: Observable<string[]>;
  filteredCountries!: Observable<string[]>;


  constructor(
    private fb: FormBuilder,
    private courseService: CourseService,
    private route: ActivatedRoute,
    private router: Router,
    private autocompleteService: AutocompleteService
  ) {
    this.courseForm = this.fb.group({
      University: ['', Validators.required],
      City: ['', Validators.required],
      Country: ['', Validators.required],
      CourseName: ['', Validators.required],
      CourseDescription: ['', Validators.required],
      StartDate: ['', Validators.required],
      EndDate: ['', Validators.required],
      Price: ['', [Validators.required, Validators.min(0)]],
      Currency: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.autocompleteService.getCurrencies().subscribe(data => {
      this.currencies = data;
      this.courseForm.get('Currency')?.reset();
    });

    this.route.paramMap.subscribe(params => {
      this.courseId = params.get('id');
      if (this.courseId) {
        this.isEditMode = true;
        this.courseForm.get('CourseName')?.disable();
        this.courseForm.get('University')?.disable();
        this.courseForm.get('Country')?.disable();
        this.courseForm.get('City')?.disable();
        this.courseService.getCourseById(this.courseId).subscribe(course => {
          this.courseForm.patchValue(course);
        });
      }
      if (!this.isEditMode) {
        this.autocompleteService.getUniversities().subscribe(data => {
          this.universities = data;
          this.filteredUniversities = this.courseForm.get('University')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value, this.universities))
          );
        });
    
        this.autocompleteService.getCities().subscribe(data => {
          this.cities = data;
          this.filteredCities = this.courseForm.get('City')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value, this.cities))
          );
        });
    
        this.autocompleteService.getCountries().subscribe(data => {
          this.countries = data;
          this.filteredCountries = this.courseForm.get('Country')!.valueChanges.pipe(
            startWith(''),
            map(value => this._filter(value, this.countries))
          );
        });
      }
    });
  }

  private _filter(value: string, options: string[]): string[] {
    const filterValue = value.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(filterValue));
  }


  onSubmit() {
    this.courseForm.markAllAsTouched();
    if (this.courseForm.valid) {
      if (this.isEditMode) {
        this.courseService.updateCourse(this.courseId!, this.courseForm.value).subscribe(() => {
          this.router.navigate(['/']);
        });
      } else {
        this.courseService.addCourse(this.courseForm.value).subscribe(() => {
          this.router.navigate(['/']);
        });
      }
    }
  }

  onCancel() {
    this.router.navigate(['/']);
  }
}
