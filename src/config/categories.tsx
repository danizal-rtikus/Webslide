import React from 'react';
import { 
  BookOpen, 
  FileText, 
  Rocket, 
  Building2, 
  UserCircle, 
  Calendar, 
  Wrench 
} from 'lucide-react';

export interface Category {
  id: string;
  label: string;
  icon: (props: { size: number }) => React.ReactNode;
  color: string;
  description: string;
  promptInstruction: string;
}

export const CATEGORIES: Category[] = [
  { 
    id: 'Pembelajaran', 
    label: 'Pembelajaran',
    icon: (props) => <BookOpen {...props} />, 
    color: 'indigo', 
    description: 'Cocok untuk materi kuliah, modul sekolah, atau materi kursus.',
    promptInstruction: 'Tone: Educational and informative. Use clear definitions, hierarchical bullet points, and conclude with a summary. Focus on clarity and knowledge retention.'
  },
  { 
    id: 'Skripsi / TA', 
    label: 'Skripsi / TA',
    icon: (props) => <FileText {...props} />, 
    color: 'blue', 
    description: 'Struktur formal untuk penelitian, skripsi, atau tugas akhir.',
    promptInstruction: 'Tone: Highly formal and academic. Structure follows: Introduction, Methodology, Results, Discussion, and Conclusion. Use precise terminology and cite data points where available.'
  },
  { 
    id: 'Pitching Program', 
    label: 'Pitching Program',
    icon: (props) => <Rocket {...props} />, 
    color: 'amber', 
    description: 'Persuasif untuk startup, kompetisi, atau ide proyek.',
    promptInstruction: 'Tone: Strategic, persuasive, and high-energy. Focus on Problem-Solution fit, Market Opportunity, Unique Selling Points, and a strong Call to Action.'
  },
  { 
    id: 'Corporation', 
    label: 'Corporation',
    icon: (props) => <Building2 {...props} />, 
    color: 'slate', 
    description: 'Sesuai untuk laporan perusahaan, KPI, atau profil bisnis.',
    promptInstruction: 'Tone: Professional, direct, and data-driven. Focus on executive summaries, key performance indicators, business value, and corporate alignment.'
  },
  { 
    id: 'Personal Career', 
    label: 'Personal Career',
    icon: (props) => <UserCircle {...props} />, 
    color: 'emerald', 
    description: 'Ubah CV atau Portofolio Anda menjadi slide interaktif.',
    promptInstruction: 'Tone: Personal yet professional. Highlight skills, experience highlights, personal achievements, and career aspirations. Use a narrative that builds personal brand.'
  },
  { 
    id: 'Event Guide', 
    label: 'Event Guide',
    icon: (props) => <Calendar {...props} />, 
    color: 'rose', 
    description: 'Rundown acara, profil pembicara, dan panduan event.',
    promptInstruction: 'Tone: Engaging, organized, and time-sensitive. Focus on scheduling, speaker bios, venue logistics, and attendee value.'
  },
  { 
    id: 'Product Manual', 
    label: 'Product Manual',
    icon: (props) => <Wrench {...props} />, 
    color: 'cyan', 
    description: 'Panduan teknis, fitur produk, dan cara penggunaan.',
    promptInstruction: 'Tone: Instructional, technical, and precise. Use step-by-step numbered lists, feature highlights, and troubleshooting tips.'
  }
];
