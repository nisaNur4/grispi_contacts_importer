# Grispi Contacts Importer

Bu proje, farklı Excel dosyalarındaki kontak bilgilerini Grispi sisteminde kullanılan standart contact şablonuna dönüştürebilecek bir import aracıdır. Kullanıcıların ellerindeki verileri kolayca sisteme entegre edebilmesini sağlar.

## Özellikler
- Excel dosyası yükleme (.xlsx formatı)
- İlk birkaç satırı önizleme
- Dinamik sütun eşleştirme (Ad, Soyad, E-posta, Telefon vb.)
- Eşleştirme şablonlarını kaydetme ve yeniden kullanma
- Verileri Grispi formatına dönüştürme
- SQLite veri tabanında saklama
- Import durumu raporlama

## Teknolojiler

**Backend:**
- Python 3.8+
- FastAPI
- Pandas
- OpenPyXL
- SQLite
- Uvicorn

**Frontend:**
- React 18
- Tailwind CSS
- React Dropzone
- Axios
- Lucide React

## Kurulum ve Çalıştırma

### Backend Kurulumu

```bash
cd backend
python -m venv venv
venv\Scripts\activate  
pip install -r requirements.txt
python main.py
```

### Frontend Kurulumu

```bash
cd frontend
npm install
npm start
```

## API Endpoints

| Endpoint          | Method | Açıklama                            |
|-------------------|--------|-------------------------------------|
| `/`               | GET    | API durumu ve mevcut endpointler    |
| `/health`         | GET    | Sistem sağlık kontrolü              |
| `/upload-excel`   | POST   | Excel dosyası yükleme               |
| `/map-columns`    | POST   | Sütun eşleştirme ve şablon kaydetme |
| `/process-import` | POST   | Import işlemini başlatma            |
| `/contacts`       | GET    | İçe aktarılan kontakları listeleme  |
| `/templates`      | GET    | Kaydedilen şablonları listeleme     |
| `/import-logs`    | GET    | Import geçmişini listeleme          |

## Veri tabanı Şeması

**contacts tablosu:**
- id (PRIMARY KEY)
- name, surname, email, phone
- company, position, notes
- created_at

**import_templates tablosu:**
- id (PRIMARY KEY)
- name, column_mapping
- created_at

**import_logs tablosu:**
- id (PRIMARY KEY)
- filename, status, total_rows, success_count, error_count
- created_at
---
## Özellik Detayları

**Dosya Yükleme:** Maksimum 10MB .xlsx dosyaları desteklenir
**Sütun Eşleştirme:** Dinamik olarak Excel sütunlarını Grispi alanlarıyla eşleştirme
**Şablon Yönetimi:** Eşleştirmeleri kaydetme ve yeniden kullanma
**Veri Dönüştürme:** Excel verilerini Grispi JSON formatına çevirme
**Hata Yönetimi:** Detaylı hata raporlama ve loglama

## Güvenlik

- CORS yapılandırması
- Dosya boyutu sınırlaması
- SQL injection koruması
- Giriş doğrulama

## Geliştirme

Proje FastAPI backend ve React frontend'den oluşur. Backend SQLite veritabanı kullanır ve REST API sağlar. Frontend modern React hooks ve Tailwind CSS ile geliştirilmiştir.




# grispi_contacts_importer
