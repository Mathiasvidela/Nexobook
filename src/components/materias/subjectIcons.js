import {
  Atom, BarChart3, Binary, BookOpen, Brain, Building2, Calculator, CheckSquare,
  Code2, Database, FileText, FlaskConical, Globe, Layers, Palette, Scale,
  Server, Shield, Smartphone, Wifi
} from 'lucide-react';

export const SUBJECT_ICONS = [
  ['BookOpen', BookOpen, 'General'], ['Code2', Code2, 'Programación'], ['Server', Server, 'Servidores'],
  ['Database', Database, 'Bases de datos'], ['Globe', Globe, 'Web'], ['Smartphone', Smartphone, 'Aplicaciones móviles'],
  ['Wifi', Wifi, 'Redes'], ['Shield', Shield, 'Seguridad'], ['Binary', Binary, 'Computación'],
  ['Calculator', Calculator, 'Matemática'], ['BarChart3', BarChart3, 'Estadística'], ['Atom', Atom, 'Ciencias'],
  ['FlaskConical', FlaskConical, 'Laboratorio'], ['Brain', Brain, 'Aprendizaje'], ['Palette', Palette, 'Diseño'],
  ['Building2', Building2, 'Organización'], ['Scale', Scale, 'Derecho y ética'], ['CheckSquare', CheckSquare, 'Pruebas'],
  ['FileText', FileText, 'Teoría'], ['Layers', Layers, 'Arquitectura']
];

export const SUBJECT_ICON_MAP = Object.fromEntries(SUBJECT_ICONS.map(([id, Icon]) => [id, Icon]));
