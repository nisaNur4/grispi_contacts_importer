import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Upload, Users, FileText, Settings, Home } from 'lucide-react';
import FileUpload from './components/FileUpload';
import ContactList from './components/ContactList';
import ImportLogs from './components/ImportLogs';
import Templates from './components/Templates';

function App() {
  const [activeTab, setActiveTab] = useState('upload');
  const navigation = [
    { name: 'Ana Sayfa', href: '/', icon: Home, current: activeTab === 'home' },
    { name: 'Dosya Yükle', href: '/upload', icon: Upload, current: activeTab === 'upload' },
    { name: 'Kontaklar', href: '/contacts', icon: Users, current: activeTab === 'contacts' },
    { name: 'Import Logları', href: '/logs', icon: FileText, current: activeTab === 'logs' },
    { name: 'Şablonlar', href: '/templates', icon: Settings, current: activeTab === 'templates' },
  ];

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Grispi Contacts Importer
                  </h1>
                </div>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="lg:grid lg:grid-cols-12 lg:gap-x-5">
            <aside className="py-6 px-2 sm:px-6 lg:col-span-3">
              <nav className="space-y-1">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setActiveTab(item.href.replace('/', '') || 'home')}
                    className={`${
                      item.current
                        ? 'bg-primary-50 border-primary-500 text-primary-700'
                        : 'border-transparent text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    } group border-l-4 py-2 px-3 flex items-center text-sm font-medium`}
                  >
                    <item.icon
                      className={`${
                        item.current ? 'text-primary-500' : 'text-gray-400 group-hover:text-gray-500'
                      } mr-3 flex-shrink-0 h-6 w-6`}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
              </nav>
            </aside>
            <main className="space-y-6 sm:px-6 lg:col-span-9">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/upload" element={<FileUpload />} />
                <Route path="/contacts" element={<ContactList />} />
                <Route path="/logs" element={<ImportLogs />} />
                <Route path="/templates" element={<Templates />} />
              </Routes>
            </main>
          </div>
        </div>
      </div>
    </Router>
  );
}

function HomePage() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Grispi Contacts Importer'a Hoş Geldiniz
        </h2>
        <p className="text-lg text-gray-600 mb-8">
          Excel dosyalarındaki kontak bilgilerini kolayca Grispi sistemine aktarın.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="bg-primary-50 p-6 rounded-lg">
            <Upload className="h-12 w-12 text-primary-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Dosya Yükle</h3>
            <p className="text-gray-600">Excel dosyanızı yükleyin ve önizleme yapın</p>
          </div>
          
          <div className="bg-green-50 p-6 rounded-lg">
            <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Kontakları Görüntüle</h3>
            <p className="text-gray-600">Aktarılan kontakları listeleyin ve yönetin</p>
          </div>
          
          <div className="bg-purple-50 p-6 rounded-lg">
            <FileText className="h-12 w-12 text-purple-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Raporlar</h3>
            <p className="text-gray-600">Import işlemlerinin detaylı raporlarını görün</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App; 