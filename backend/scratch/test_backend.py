import json
import os
import unittest
from io import BytesIO
import openpyxl

# Import flask app
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db

class TestIEEESystem(unittest.TestCase):
    def setUp(self):
        # Configure Flask application for testing
        app.config['TESTING'] = True
        self.client = app.test_client()
        
    def test_complete_workflow(self):
        print("\n--- STARTING E2E INTEGRATION TEST ---")
        
        # 1. TEST ADMIN LOGIN
        print("Testing Admin Login...")
        login_res = self.client.post('/api/auth/login', json={
            'username': 'admin@ieee.org',
            'password': 'Admin@123'
        })
        self.assertEqual(login_res.status_code, 200)
        login_data = json.loads(login_res.data)
        admin_token = login_data['token']
        self.assertEqual(login_data['role'], 'admin')
        print("[OK] Admin Login successful.")
        
        # Set Authorization headers
        headers = {'Authorization': f'Bearer {admin_token}'}
        
        # 2. TEST VOLUNTEER CREATION
        print("Testing Volunteer Creation...")
        vol_res = self.client.post('/api/admin/volunteers', json={
            'name': 'Test Volunteer',
            'email': 'volunteer_test@ieee.org',
            'password': 'Volunteer@123'
        }, headers=headers)
        self.assertEqual(vol_res.status_code, 200)
        print("[OK] Volunteer created successfully.")

        # Test Volunteer Login
        vol_login_res = self.client.post('/api/auth/login', json={
            'username': 'volunteer_test@ieee.org',
            'password': 'Volunteer@123'
        })
        self.assertEqual(vol_login_res.status_code, 200)
        vol_data = json.loads(vol_login_res.data)
        volunteer_token = vol_data['token']
        vol_headers = {'Authorization': f'Bearer {volunteer_token}'}
        print("[OK] Volunteer Login successful.")
        
        # 3. TEST EVENT CREATION
        print("Testing Event Creation...")
        event_res = self.client.post('/api/admin/events', json={
            'eventName': 'IEEE Workshop 2026',
            'startDate': '2026-08-01',
            'endDate': '2026-08-03' # 3 days
        }, headers=headers)
        self.assertEqual(event_res.status_code, 200)
        event_data = json.loads(event_res.data)['event']
        event_id = event_data['eventId']
        self.assertEqual(event_data['daysCount'], 3)
        self.assertEqual(event_data['days'], ['Day 1', 'Day 2', 'Day 3'])
        print("[OK] Event created with 3 days calculation.")
        
        # 4. TEST EXCEL FILE GENERATION AND UPLOAD
        print("Generating dummy Excel participant list...")
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.append(["Registration Number", "Name", "Department", "Email"])
        ws.append(["2026CS101", "Alice Smith", "Computer Science", "alice@example.com"])
        ws.append(["2026EC102", "Bob Johnson", "Electronics", "bob@example.com"])
        
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        print("Testing Participant Import Upload...")
        upload_res = self.client.post('/api/admin/participants/upload', data={
            'file': (excel_file, 'participants.xlsx')
        }, headers=headers)
        self.assertEqual(upload_res.status_code, 200)
        upload_data = json.loads(upload_res.data)
        self.assertEqual(len(upload_data['imported']), 2)
        print("[OK] Excel upload parsed successfully and created student accounts.")
        
        # Get students
        st_res = self.client.get('/api/admin/students', headers=headers)
        self.assertEqual(st_res.status_code, 200)
        students = json.loads(st_res.data)
        self.assertGreaterEqual(len(students), 2)
        
        # Find Alice
        alice = next(st for st in students if st['registrationNumber'] == '2026CS101')
        alice_id = alice['studentId']
        alice_qr = alice['qrToken']
        print(f"[OK] Alice found in database with unique QR token: {alice_qr}")
        
        # 5. TEST STUDENT LOGIN
        print("Testing Student Login...")
        st_login_res = self.client.post('/api/auth/login', json={
            'username': '2026CS101',
            'password': 'Student@123'
        })
        self.assertEqual(st_login_res.status_code, 200)
        print("[OK] Student Login successful using registration number and default password.")

        # Test Student profile fetch
        st_token = json.loads(st_login_res.data)['token']
        st_profile_res = self.client.get('/api/student/profile', headers={'Authorization': f'Bearer {st_token}'})
        self.assertEqual(st_profile_res.status_code, 200)
        st_profile = json.loads(st_profile_res.data)
        self.assertEqual(st_profile['qrToken'], alice_qr)
        print("[OK] Student profile loads with attendance checklist mapping.")
        
        # 6. TEST SCAN RESOLUTION BY VOLUNTEER
        print("Testing Volunteer scanning Student QR...")
        scan_res = self.client.post('/api/volunteer/scan', json={
            'qrToken': alice_qr
        }, headers=vol_headers)
        self.assertEqual(scan_res.status_code, 200)
        scan_data = json.loads(scan_res.data)
        self.assertEqual(scan_data['studentId'], alice_id)
        self.assertEqual(scan_data['name'], 'Alice Smith')
        print("[OK] Scanned QR token resolves to correct student details.")
        
        # 7. TEST VOLUNTEER SUBMIT ATTENDANCE (Base64 Photos)
        dummy_photo_b64 = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA="
        print("Testing Volunteer Submitting Attendance...")
        att_res = self.client.post('/api/volunteer/submit-attendance', json={
            'studentId': alice_id,
            'eventId': event_id,
            'day': 'Day 1',
            'facePhoto': dummy_photo_b64,
            'idPhoto': dummy_photo_b64
        }, headers=vol_headers)
        self.assertEqual(att_res.status_code, 200)
        attendance_id = json.loads(att_res.data)['record']['attendanceId']
        print("[OK] Attendance submitted successfully. Marked as 'Pending Verification'.")
        
        # Test Duplicate check
        print("Testing Duplicate Submission Prevention...")
        dup_res = self.client.post('/api/volunteer/submit-attendance', json={
            'studentId': alice_id,
            'eventId': event_id,
            'day': 'Day 1',
            'facePhoto': dummy_photo_b64,
            'idPhoto': dummy_photo_b64
        }, headers=vol_headers)
        self.assertEqual(dup_res.status_code, 400)
        print("[OK] Duplicate submissions correctly blocked with 400 Bad Request.")
        
        # 8. TEST ADMIN MANUAL REVIEW (VERIFICATION)
        print("Testing Admin Reviewing Pending attendance...")
        pending_res = self.client.get('/api/admin/verification/pending', headers=headers)
        self.assertEqual(pending_res.status_code, 200)
        pending_records = json.loads(pending_res.data)
        self.assertTrue(any(rec['attendanceId'] == attendance_id for rec in pending_records))
        print("[OK] Submitted record displays in pending verification console.")
        
        # Verify the record
        verify_res = self.client.post('/api/admin/verification/verify', json={
            'attendanceId': attendance_id,
            'status': 'Verified',
            'remarks': 'Face and ID matched perfectly.'
        }, headers=headers)
        self.assertEqual(verify_res.status_code, 200)
        print("[OK] Attendance record successfully verified.")
        
        # Check student status updated
        st_profile_res2 = self.client.get('/api/student/profile', headers={'Authorization': f'Bearer {st_token}'})
        st_profile2 = json.loads(st_profile_res2.data)
        event_check = next(chk for chk in st_profile2['attendanceChecklist'] if chk['eventId'] == event_id)
        self.assertEqual(event_check['attendance']['Day 1'], 'Verified')
        print("[OK] Student dashboard correctly shows 'Verified' status.")
        
        # 9. TEST REPORTS AND EXPORT EXCEL
        print("Testing Report Analytics Stats...")
        stats_res = self.client.get(f'/api/admin/reports/stats?eventId={event_id}', headers=headers)
        self.assertEqual(stats_res.status_code, 200)
        stats_data = json.loads(stats_res.data)
        self.assertEqual(stats_data['verified'], 1)
        self.assertEqual(stats_data['pending'], 0)
        print("[OK] Analytics counts verified attendance counts correctly.")
        
        print("Testing Reports Export to Excel File download...")
        export_res = self.client.get(f'/api/admin/reports/export?eventId={event_id}', headers=headers)
        self.assertEqual(export_res.status_code, 200)
        self.assertEqual(export_res.mimetype, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        print("[OK] Excel reports downloader returns raw binary stream.")
        
        print("\n--- E2E INTEGRATION TEST COMPLETED SUCCESSFULLY ---")

if __name__ == '__main__':
    unittest.main()
