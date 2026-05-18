export interface TestData {
  projects: {
    name: string;
    description: string;
    artists: string[];
  }[];
  contacts: {
    name: string;
    email: string;
    phone: string;
    company: string;
  }[];
  budgets: {
    name: string;
    totalAmount: number;
    categories: {
      name: string;
      amount: number;
    }[];
  }[];
  bookings: {
    title: string;
    venue: string;
    date: string;
    fee: number;
  }[];
  epks: {
    title: string;
    description: string;
    artist: string;
  }[];
}

export const testData: TestData = {
  projects: [
    {
      name: 'Gira 2025',
      description: 'European tour for summer 2025',
      artists: ['Rita Payés']
    },
    {
      name: 'Campaña PR',
      description: 'Marketing campaign for new album',
      artists: ['Rita Payés']
    },
    {
      name: 'Festival Circuit',
      description: 'Festival bookings for 2025',
      artists: ['Rita Payés']
    }
  ],
  contacts: [
    {
      name: 'María García',
      email: 'maria.garcia@venue.com',
      phone: '+34 600 123 456',
      company: 'Palau de la Música'
    },
    {
      name: 'John Smith',
      email: 'john@festivalmanagement.com',
      phone: '+44 20 7946 0958',
      company: 'Festival Management Ltd'
    },
    {
      name: 'Pierre Dubois',
      email: 'pierre@agenceartistique.fr',
      phone: '+33 1 42 86 89 90',
      company: 'Agence Artistique Paris'
    }
  ],
  budgets: [
    {
      name: 'Gira Europa 2025',
      totalAmount: 150000,
      categories: [
        { name: 'Transporte', amount: 45000 },
        { name: 'Alojamiento', amount: 30000 },
        { name: 'Personal técnico', amount: 40000 },
        { name: 'Marketing', amount: 20000 },
        { name: 'Otros gastos', amount: 15000 }
      ]
    },
    {
      name: 'Producción álbum',
      totalAmount: 80000,
      categories: [
        { name: 'Estudio', amount: 25000 },
        { name: 'Músicos', amount: 20000 },
        { name: 'Mezcla y master', amount: 15000 },
        { name: 'Marketing', amount: 20000 }
      ]
    }
  ],
  bookings: [
    {
      title: 'Concierto Palau de la Música',
      venue: 'Palau de la Música Catalana',
      date: '2025-06-15',
      fee: 25000
    },
    {
      title: 'Festival de Jazz',
      venue: 'Vitoria Jazz Festival',
      date: '2025-07-20',
      fee: 15000
    },
    {
      title: 'Teatro Real',
      venue: 'Teatro Real Madrid',
      date: '2025-09-10',
      fee: 30000
    }
  ],
  epks: [
    {
      title: 'Rita Payés - EPK Principal',
      description: 'Electronic Press Kit principal para Rita Payés',
      artist: 'Rita Payés'
    },
    {
      title: 'Rita Payés - Tour 2025',
      description: 'EPK específico para la gira 2025',
      artist: 'Rita Payés'
    }
  ]
};

// Helper function to generate unique test data
export function generateUniqueTestData(baseData: any, suffix: string) {
  if (typeof baseData === 'string') {
    return `${baseData} ${suffix}`;
  }
  
  if (Array.isArray(baseData)) {
    return baseData.map(item => generateUniqueTestData(item, suffix));
  }
  
  if (typeof baseData === 'object' && baseData !== null) {
    const result: any = {};
    for (const [key, value] of Object.entries(baseData)) {
      if (key === 'name' || key === 'title' || key === 'email') {
        result[key] = generateUniqueTestData(value, suffix);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
  
  return baseData;
}