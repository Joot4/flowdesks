import { Injectable, Signal, computed, signal } from '@angular/core';

export type AppLanguage = 'pt-BR' | 'en' | 'es';

const STORAGE_KEY = 'flowdesks.lang';

const DICTIONARY: Record<AppLanguage, Record<string, string>> = {
  'pt-BR': {
    'app.subtitle': 'Gestao de Colaboradores',
    'app.punch': 'Ponto',
    'app.profile': 'Perfil',
    'app.account': 'Conta',
    'app.logout': 'Sair',
    'app.offline': 'Modo offline: somente leitura de cache local.',
    'lang.label': 'Idioma',
    'lang.pt': 'Portugues',
    'lang.en': 'Ingles',
    'lang.es': 'Espanhol',

    'login.welcome': 'Bem-vindo de volta',
    'login.subtitle': 'Entre para acessar o painel operacional.',
    'login.email': 'Email',
    'login.password': 'Senha',
    'login.entering': 'Entrando...',
    'login.enter': 'Entrar',

    'nav.calendar': 'Calendario',
    'nav.employees': 'Colaboradores',
    'nav.locations': 'Locais',
    'nav.activities': 'Atividades',
    'director.admins': 'Administradores',

    'employees.title': 'Colaboradores',
    'employees.add': 'Adicionar colaborador',
    'employees.adding': 'Cadastrando...',
    'common.name': 'Nome',
    'common.code': 'Matricula',
    'common.job': 'Cargo',
    'common.actions': 'Acoes',
    'common.edit': 'Editar',
    'common.delete': 'Excluir',
    'common.all': 'Todos',

    'locations.title': 'Locais',
    'locations.address': 'Endereco',
    'locations.state': 'UF / State',
    'locations.radius': 'Raio cercado (m)',
    'locations.mapsLink': 'Link Maps',
    'locations.detectHelp': 'Cole o link do Maps para detectar coordenadas automaticamente.',
    'locations.active': 'Ativo',
    'common.save': 'Salvar',
    'locations.status': 'Status',
    'locations.maps': 'Maps',
    'locations.openMap': 'Abrir mapa',
    'locations.geofence': 'Cercado',

    'activities.title': 'Tipos de atividade',

    'calendar.title': 'Agenda operacional',
    'calendar.subtitle': 'Planeje, confirme e remaneje escalas com arrastar e soltar.',
    'calendar.total': 'Total',
    'calendar.confirmed': 'Confirmados',
    'calendar.planned': 'Planejados',
    'calendar.cancelled': 'Cancelados',
    'calendar.employee': 'Colaborador',
    'calendar.location': 'Local',
    'calendar.activity': 'Atividade',
    'calendar.status': 'Status',
    'calendar.periodStart': 'Periodo inicial',
    'calendar.periodEnd': 'Periodo final',
    'calendar.applyFilters': 'Aplicar filtros',
    'calendar.clear': 'Limpar',
    'calendar.exportExcel': 'Exportar Excel',
    'calendar.loadedAssignments': 'Alocacoes da janela carregada',
    'calendar.reassign': 'Remanejar',

    'me.title': 'Meu ponto',
    'me.subtitle': 'Resumo rapido do seu dia de trabalho.',
    'me.upcoming': 'Proximas alocacoes',
    'me.done': 'Concluidas',
    'me.pending': 'Pendentes',
    'me.history': 'Historico do meu trabalho',

    'profile.title': 'Meu perfil',
    'profile.security': 'Seguranca',
    'profile.save': 'Salvar perfil',
    'profile.newPassword': 'Nova senha',
    'profile.confirmPassword': 'Confirmar senha',
    'profile.updatePassword': 'Atualizar senha',

    'assignment.details': 'Detalhes da alocacao',
    'common.close': 'Fechar',
    'assignment.checkin': 'Bater entrada',
    'assignment.checkout': 'Bater saida'
  },
  en: {
    'app.subtitle': 'Workforce Management',
    'app.punch': 'Punch',
    'app.profile': 'Profile',
    'app.account': 'Account',
    'app.logout': 'Logout',
    'app.offline': 'Offline mode: local cache read-only.',
    'lang.label': 'Language',
    'lang.pt': 'Portuguese',
    'lang.en': 'English',
    'lang.es': 'Spanish',

    'login.welcome': 'Welcome back',
    'login.subtitle': 'Sign in to access the operations panel.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.entering': 'Signing in...',
    'login.enter': 'Sign in',

    'nav.calendar': 'Calendar',
    'nav.employees': 'Employees',
    'nav.locations': 'Locations',
    'nav.activities': 'Activities',
    'director.admins': 'Administrators',

    'employees.title': 'Employees',
    'employees.add': 'Add employee',
    'employees.adding': 'Creating...',
    'common.name': 'Name',
    'common.code': 'ID Code',
    'common.job': 'Role',
    'common.actions': 'Actions',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.all': 'All',

    'locations.title': 'Locations',
    'locations.address': 'Address',
    'locations.state': 'State',
    'locations.radius': 'Geofence radius (m)',
    'locations.mapsLink': 'Maps URL',
    'locations.detectHelp': 'Paste a Maps link to detect coordinates automatically.',
    'locations.active': 'Active',
    'common.save': 'Save',
    'locations.status': 'Status',
    'locations.maps': 'Maps',
    'locations.openMap': 'Open map',
    'locations.geofence': 'Geofence',

    'activities.title': 'Activity types',

    'calendar.title': 'Operations calendar',
    'calendar.subtitle': 'Plan, confirm and reassign shifts with drag and drop.',
    'calendar.total': 'Total',
    'calendar.confirmed': 'Confirmed',
    'calendar.planned': 'Planned',
    'calendar.cancelled': 'Cancelled',
    'calendar.employee': 'Employee',
    'calendar.location': 'Location',
    'calendar.activity': 'Activity',
    'calendar.status': 'Status',
    'calendar.periodStart': 'Start period',
    'calendar.periodEnd': 'End period',
    'calendar.applyFilters': 'Apply filters',
    'calendar.clear': 'Clear',
    'calendar.exportExcel': 'Export Excel',
    'calendar.loadedAssignments': 'Assignments in current window',
    'calendar.reassign': 'Reassign',

    'me.title': 'My timesheet',
    'me.subtitle': 'Quick summary of your workday.',
    'me.upcoming': 'Upcoming assignments',
    'me.done': 'Completed',
    'me.pending': 'Pending',
    'me.history': 'Work history',

    'profile.title': 'My profile',
    'profile.security': 'Security',
    'profile.save': 'Save profile',
    'profile.newPassword': 'New password',
    'profile.confirmPassword': 'Confirm password',
    'profile.updatePassword': 'Update password',

    'assignment.details': 'Assignment details',
    'common.close': 'Close',
    'assignment.checkin': 'Check in',
    'assignment.checkout': 'Check out'
  },
  es: {
    'app.subtitle': 'Gestion de Colaboradores',
    'app.punch': 'Fichaje',
    'app.profile': 'Perfil',
    'app.account': 'Cuenta',
    'app.logout': 'Salir',
    'app.offline': 'Modo sin conexion: solo lectura del cache local.',
    'lang.label': 'Idioma',
    'lang.pt': 'Portugues',
    'lang.en': 'Ingles',
    'lang.es': 'Espanol',

    'login.welcome': 'Bienvenido de nuevo',
    'login.subtitle': 'Inicia sesion para acceder al panel operativo.',
    'login.email': 'Correo',
    'login.password': 'Contrasena',
    'login.entering': 'Ingresando...',
    'login.enter': 'Entrar',

    'nav.calendar': 'Calendario',
    'nav.employees': 'Colaboradores',
    'nav.locations': 'Locales',
    'nav.activities': 'Actividades',
    'director.admins': 'Administradores',

    'employees.title': 'Colaboradores',
    'employees.add': 'Agregar colaborador',
    'employees.adding': 'Creando...',
    'common.name': 'Nombre',
    'common.code': 'Matricula',
    'common.job': 'Cargo',
    'common.actions': 'Acciones',
    'common.edit': 'Editar',
    'common.delete': 'Eliminar',
    'common.all': 'Todos',

    'locations.title': 'Locales',
    'locations.address': 'Direccion',
    'locations.state': 'Estado',
    'locations.radius': 'Radio geocerca (m)',
    'locations.mapsLink': 'Link Maps',
    'locations.detectHelp': 'Pega un link de Maps para detectar coordenadas automaticamente.',
    'locations.active': 'Activo',
    'common.save': 'Guardar',
    'locations.status': 'Estado',
    'locations.maps': 'Maps',
    'locations.openMap': 'Abrir mapa',
    'locations.geofence': 'Geocerca',

    'activities.title': 'Tipos de actividad',

    'calendar.title': 'Calendario operativo',
    'calendar.subtitle': 'Planifica, confirma y reasigna turnos con arrastrar y soltar.',
    'calendar.total': 'Total',
    'calendar.confirmed': 'Confirmados',
    'calendar.planned': 'Planificados',
    'calendar.cancelled': 'Cancelados',
    'calendar.employee': 'Colaborador',
    'calendar.location': 'Local',
    'calendar.activity': 'Actividad',
    'calendar.status': 'Estado',
    'calendar.periodStart': 'Periodo inicial',
    'calendar.periodEnd': 'Periodo final',
    'calendar.applyFilters': 'Aplicar filtros',
    'calendar.clear': 'Limpiar',
    'calendar.exportExcel': 'Exportar Excel',
    'calendar.loadedAssignments': 'Asignaciones de la ventana cargada',
    'calendar.reassign': 'Reasignar',

    'me.title': 'Mi punto',
    'me.subtitle': 'Resumen rapido de tu jornada.',
    'me.upcoming': 'Proximas asignaciones',
    'me.done': 'Completadas',
    'me.pending': 'Pendientes',
    'me.history': 'Historial de trabajo',

    'profile.title': 'Mi perfil',
    'profile.security': 'Seguridad',
    'profile.save': 'Guardar perfil',
    'profile.newPassword': 'Nueva contrasena',
    'profile.confirmPassword': 'Confirmar contrasena',
    'profile.updatePassword': 'Actualizar contrasena',

    'assignment.details': 'Detalles de asignacion',
    'common.close': 'Cerrar',
    'assignment.checkin': 'Marcar entrada',
    'assignment.checkout': 'Marcar salida'
  }
};

@Injectable({ providedIn: 'root' })
export class I18nService {
  private readonly languageSignal = signal<AppLanguage>(this.detectInitialLanguage());

  readonly language: Signal<AppLanguage> = this.languageSignal.asReadonly();
  readonly calendarLocaleCode = computed<string>(() => {
    const lang = this.languageSignal();
    if (lang === 'en') {
      return 'en';
    }
    if (lang === 'es') {
      return 'es';
    }
    return 'pt-br';
  });

  setLanguage(language: AppLanguage): void {
    this.languageSignal.set(language);
    localStorage.setItem(STORAGE_KEY, language);
  }

  t(key: string): string {
    const lang = this.languageSignal();
    return DICTIONARY[lang][key] ?? DICTIONARY['pt-BR'][key] ?? key;
  }

  private detectInitialLanguage(): AppLanguage {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'pt-BR' || stored === 'en' || stored === 'es') {
      return stored;
    }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith('en')) {
      return 'en';
    }
    if (browserLang.startsWith('es')) {
      return 'es';
    }
    return 'pt-BR';
  }
}
