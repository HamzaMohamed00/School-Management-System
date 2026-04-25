import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { StudentService } from '@core/services/student.service';
import { ClassRoomService } from '@core/services/classroom.service';
import { ParentService } from '@core/services/parent.service';
import { NotificationService } from '@core/services/notification.service';
import { ClassRoom } from '@core/models/class.model';
import { Parent } from '@core/models/parent.model';

@Component({
  selector: 'app-student-add',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './student-add.component.html',
  styleUrls: ['./student-add.component.css']
})
export class StudentAddComponent implements OnInit {
  studentForm: FormGroup;
  classes: ClassRoom[] = [];
  parents: Parent[] = [];
  imagePreview: string | null = null;
  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private studentService: StudentService,
    private classService: ClassRoomService,
    private parentService: ParentService,
    private notification: NotificationService,
    private router: Router
  ) {
    this.studentForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      phone: [''],
      birthDate: ['', Validators.required],
      classRoomId: ['', Validators.required],
      parentId: [''],
      address: [''],
      medicalNotes: ['']
    });
  }

  async ngOnInit() {
    await Promise.all([
      this.loadClasses(),
      this.loadParents()
    ]);
  }

  async loadClasses(): Promise<void> {
    this.classes = await this.classService.getAll();
  }

  async loadParents(): Promise<void> {
    this.parents = await this.parentService.getAll();
  }

  onImageSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Preview image
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
      
      // Store file for upload
      this.studentForm.addControl('image', this.fb.control(file));
    }
  }

  async onSubmit(): Promise<void> {
    if (this.studentForm.invalid) {
      Object.keys(this.studentForm.controls).forEach(key => {
        this.studentForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting = true;
    
    try {
      const formData = new FormData();
      const formValue = this.studentForm.value;
      
      // Append form data
      Object.keys(formValue).forEach(key => {
        if (key !== 'image' && formValue[key]) {
          formData.append(key, formValue[key]);
        }
      });
      
      if (formValue.image) {
        formData.append('image', formValue.image);
      }

      const newStudent = await this.studentService.create(formData);
      
      this.notification.success('تم إضافة الطالب بنجاح');
      this.router.navigate(['/admin/students', newStudent.id]);
      
    } catch (error) {
      this.notification.error('حدث خطأ في إضافة الطالب');
    } finally {
      this.isSubmitting = false;
    }
  }
}