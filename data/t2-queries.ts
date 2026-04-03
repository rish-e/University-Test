export interface QueryChallenge {
  id: number;
  title: string;
  description: string;
  tables: { name: string; columns: { name: string; type: string; isPK?: boolean; isFK?: string }[] }[];
  sampleData: Record<string, Record<string, string | number>[]>;
  expectedOutput: Record<string, string | number>[];
  acceptedPatterns: string[]; // stored as strings, converted to RegExp at runtime
  requiredTokens: string[];
  hint: string;
  points: number;
}

export const queryChallenges: QueryChallenge[] = [
  {
    id: 1,
    title: 'Select All Products',
    description: 'Write a query to retrieve the name and price of every product, ordered by price from highest to lowest.',
    tables: [
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'price', type: 'DECIMAL' },
          { name: 'category', type: 'VARCHAR' },
        ],
      },
    ],
    sampleData: {
      products: [
        { id: 1, name: 'Laptop Pro', price: 1299.99, category: 'Electronics' },
        { id: 2, name: 'Desk Chair', price: 449.00, category: 'Furniture' },
        { id: 3, name: 'Wireless Mouse', price: 29.99, category: 'Electronics' },
        { id: 4, name: 'Standing Desk', price: 799.00, category: 'Furniture' },
        { id: 5, name: 'Monitor 27"', price: 549.99, category: 'Electronics' },
      ],
    },
    expectedOutput: [
      { name: 'Laptop Pro', price: 1299.99 },
      { name: 'Standing Desk', price: 799.00 },
      { name: 'Monitor 27"', price: 549.99 },
      { name: 'Desk Chair', price: 449.00 },
      { name: 'Wireless Mouse', price: 29.99 },
    ],
    acceptedPatterns: [
      'SELECT\\s+name\\s*,\\s*price\\s+FROM\\s+products\\s+ORDER\\s+BY\\s+price\\s+DESC',
      'SELECT\\s+name\\s*,\\s*price\\s+FROM\\s+products\\s+ORDER\\s+BY\\s+price\\s+DESC\\s*;?',
      'SELECT\\s+products\\.name\\s*,\\s*products\\.price\\s+FROM\\s+products\\s+ORDER\\s+BY\\s+price\\s+DESC',
    ],
    requiredTokens: ['SELECT', 'FROM', 'ORDER BY'],
    hint: 'Use SELECT column1, column2 FROM table ORDER BY column DESC.',
    points: 15,
  },
  {
    id: 2,
    title: 'Filter with WHERE',
    description: 'Find all employees in the "Engineering" department who earn more than $80,000. Return their name and salary.',
    tables: [
      {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'department', type: 'VARCHAR' },
          { name: 'salary', type: 'DECIMAL' },
          { name: 'hire_date', type: 'DATE' },
        ],
      },
    ],
    sampleData: {
      employees: [
        { id: 1, name: 'Alice Wong', department: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob Martinez', department: 'Marketing', salary: 72000 },
        { id: 3, name: 'Carol Singh', department: 'Engineering', salary: 88000 },
        { id: 4, name: 'David Kim', department: 'Engineering', salary: 76000 },
        { id: 5, name: 'Eva Chen', department: 'Sales', salary: 82000 },
      ],
    },
    expectedOutput: [
      { name: 'Alice Wong', salary: 95000 },
      { name: 'Carol Singh', salary: 88000 },
    ],
    acceptedPatterns: [
      "SELECT\\s+name\\s*,\\s*salary\\s+FROM\\s+employees\\s+WHERE\\s+department\\s*=\\s*['\"]Engineering['\"]\\s+AND\\s+salary\\s*>\\s*80000",
      "SELECT\\s+name\\s*,\\s*salary\\s+FROM\\s+employees\\s+WHERE\\s+salary\\s*>\\s*80000\\s+AND\\s+department\\s*=\\s*['\"]Engineering['\"]",
    ],
    requiredTokens: ['SELECT', 'FROM', 'WHERE'],
    hint: 'Use WHERE with AND to combine multiple conditions: WHERE department = \'Engineering\' AND salary > 80000.',
    points: 18,
  },
  {
    id: 3,
    title: 'Join Two Tables',
    description: 'List each order with the customer name. Join the orders table with the customers table using customer_id.',
    tables: [
      {
        name: 'customers',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'email', type: 'VARCHAR' },
        ],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'customer_id', type: 'INT', isFK: 'customers.id' },
          { name: 'total', type: 'DECIMAL' },
          { name: 'order_date', type: 'DATE' },
        ],
      },
    ],
    sampleData: {
      customers: [
        { id: 1, name: 'Acme Corp', email: 'orders@acme.com' },
        { id: 2, name: 'Globex Inc', email: 'buy@globex.com' },
        { id: 3, name: 'Initech', email: 'purchasing@initech.com' },
      ],
      orders: [
        { id: 101, customer_id: 1, total: 2500.00, order_date: '2024-03-15' },
        { id: 102, customer_id: 2, total: 1800.50, order_date: '2024-03-16' },
        { id: 103, customer_id: 1, total: 950.00, order_date: '2024-03-17' },
        { id: 104, customer_id: 3, total: 3200.75, order_date: '2024-03-18' },
      ],
    },
    expectedOutput: [
      { name: 'Acme Corp', total: 2500.00, order_date: '2024-03-15' },
      { name: 'Globex Inc', total: 1800.50, order_date: '2024-03-16' },
      { name: 'Acme Corp', total: 950.00, order_date: '2024-03-17' },
      { name: 'Initech', total: 3200.75, order_date: '2024-03-18' },
    ],
    acceptedPatterns: [
      'SELECT\\s+.*name.*total.*FROM\\s+orders\\s+(INNER\\s+)?JOIN\\s+customers\\s+ON\\s+.*customer_id\\s*=\\s*customers\\.id',
      'SELECT\\s+.*name.*total.*FROM\\s+customers\\s+(INNER\\s+)?JOIN\\s+orders\\s+ON\\s+customers\\.id\\s*=\\s*.*customer_id',
      'SELECT\\s+.*name.*total.*FROM\\s+orders\\s*,\\s*customers\\s+WHERE\\s+.*customer_id\\s*=\\s*customers\\.id',
    ],
    requiredTokens: ['SELECT', 'FROM', 'JOIN'],
    hint: 'Use INNER JOIN: SELECT ... FROM orders JOIN customers ON orders.customer_id = customers.id.',
    points: 22,
  },
  {
    id: 4,
    title: 'GROUP BY with Aggregate',
    description: 'Find the total revenue and number of orders for each customer. Group results by customer name.',
    tables: [
      {
        name: 'customers',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
        ],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'customer_id', type: 'INT', isFK: 'customers.id' },
          { name: 'total', type: 'DECIMAL' },
        ],
      },
    ],
    sampleData: {
      customers: [
        { id: 1, name: 'Acme Corp' },
        { id: 2, name: 'Globex Inc' },
        { id: 3, name: 'Initech' },
      ],
      orders: [
        { id: 101, customer_id: 1, total: 2500.00 },
        { id: 102, customer_id: 2, total: 1800.50 },
        { id: 103, customer_id: 1, total: 950.00 },
        { id: 104, customer_id: 3, total: 3200.75 },
        { id: 105, customer_id: 2, total: 420.00 },
      ],
    },
    expectedOutput: [
      { name: 'Acme Corp', total_revenue: 3450.00, order_count: 2 },
      { name: 'Globex Inc', total_revenue: 2220.50, order_count: 2 },
      { name: 'Initech', total_revenue: 3200.75, order_count: 1 },
    ],
    acceptedPatterns: [
      'SELECT\\s+.*name.*SUM\\s*\\(.*total.*\\).*COUNT\\s*\\(.*\\).*FROM.*JOIN.*GROUP\\s+BY',
      'SELECT\\s+.*name.*COUNT\\s*\\(.*\\).*SUM\\s*\\(.*total.*\\).*FROM.*JOIN.*GROUP\\s+BY',
    ],
    requiredTokens: ['SELECT', 'FROM', 'JOIN', 'GROUP BY', 'SUM', 'COUNT'],
    hint: 'Use GROUP BY with aggregate functions: SELECT name, SUM(total), COUNT(*) FROM ... GROUP BY name.',
    points: 22,
  },
  {
    id: 5,
    title: 'Subquery with HAVING',
    description: 'Find all departments where the average salary is above $75,000. Return the department name and average salary.',
    tables: [
      {
        name: 'employees',
        columns: [
          { name: 'id', type: 'INT', isPK: true },
          { name: 'name', type: 'VARCHAR' },
          { name: 'department', type: 'VARCHAR' },
          { name: 'salary', type: 'DECIMAL' },
        ],
      },
    ],
    sampleData: {
      employees: [
        { id: 1, name: 'Alice Wong', department: 'Engineering', salary: 95000 },
        { id: 2, name: 'Bob Martinez', department: 'Marketing', salary: 62000 },
        { id: 3, name: 'Carol Singh', department: 'Engineering', salary: 88000 },
        { id: 4, name: 'David Kim', department: 'Marketing', salary: 71000 },
        { id: 5, name: 'Eva Chen', department: 'Sales', salary: 82000 },
        { id: 6, name: 'Frank Liu', department: 'Sales', salary: 78000 },
        { id: 7, name: 'Grace Patel', department: 'Engineering', salary: 102000 },
      ],
    },
    expectedOutput: [
      { department: 'Engineering', avg_salary: 95000 },
      { department: 'Sales', avg_salary: 80000 },
    ],
    acceptedPatterns: [
      'SELECT\\s+department\\s*,\\s*AVG\\s*\\(\\s*salary\\s*\\).*FROM\\s+employees\\s+GROUP\\s+BY\\s+department\\s+HAVING\\s+AVG\\s*\\(\\s*salary\\s*\\)\\s*>\\s*75000',
      'SELECT\\s+department\\s*,\\s*AVG\\s*\\(\\s*salary\\s*\\).*FROM\\s+employees\\s+GROUP\\s+BY\\s+department\\s+HAVING\\s+AVG\\s*\\(\\s*salary\\s*\\)\\s*>=?\\s*75000',
    ],
    requiredTokens: ['SELECT', 'FROM', 'GROUP BY', 'HAVING', 'AVG'],
    hint: 'Use HAVING to filter grouped results: GROUP BY department HAVING AVG(salary) > 75000.',
    points: 23,
  },
];
