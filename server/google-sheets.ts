import { google } from 'googleapis';
import { type SelectSales } from '@shared/schema';

export interface GoogleSheetsConfig {
  spreadsheetId: string;
  worksheetName: string;
  credentialsJson: string;
}

export class GoogleSheetsService {
  private sheets: any;
  private config: GoogleSheetsConfig;

  constructor(config: GoogleSheetsConfig) {
    this.config = config;
    this.initializeSheets();
  }

  private async initializeSheets() {
    try {
      const credentials = JSON.parse(this.config.credentialsJson);
      
      const auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      throw new Error('Google Sheets initialization failed');
    }
  }

  async ensureHeadersExist(): Promise<void> {
    try {
      const headers = [
        'ID',
        'Store ID',
        'User ID', 
        'Date',
        'Total Sales',
        'Transactions',
        'Average Ticket',
        'Total QRIS',
        'Total Cash',
        'Meter Start',
        'Meter End',
        'Total Liters',
        'Total Income',
        'Total Expenses',
        'Income Details',
        'Expense Details',
        'Shift',
        'Check In',
        'Check Out',
        'Submission Date',
        'Created At'
      ];

      // Check if headers exist
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A1:U1`,
      });

      if (!response.data.values || response.data.values.length === 0) {
        // Add headers if they don't exist
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A1:U1`,
          valueInputOption: 'RAW',
          resource: {
            values: [headers],
          },
        });
      }
    } catch (error) {
      console.error('Failed to ensure headers exist:', error);
      throw error;
    }
  }

  private formatSalesDataForSheets(sales: SelectSales): (string | number)[] {
    return [
      sales.id || '',
      sales.storeId || '',
      sales.userId || '',
      sales.date ? new Date(sales.date).toISOString() : '',
      parseFloat(sales.totalSales || '0'),
      sales.transactions || 0,
      parseFloat(sales.averageTicket || '0'),
      parseFloat(sales.totalQris || '0'),
      parseFloat(sales.totalCash || '0'),
      parseFloat(sales.meterStart || '0'),
      parseFloat(sales.meterEnd || '0'),
      parseFloat(sales.totalLiters || '0'),
      parseFloat(sales.totalIncome || '0'),
      parseFloat(sales.totalExpenses || '0'),
      sales.incomeDetails || '',
      sales.expenseDetails || '',
      sales.shift || '',
      sales.checkIn || '',
      sales.checkOut || '',
      sales.submissionDate || '',
      sales.createdAt ? new Date(sales.createdAt).toISOString() : ''
    ];
  }

  async appendSalesData(sales: SelectSales): Promise<void> {
    try {
      await this.ensureHeadersExist();
      
      const values = [this.formatSalesDataForSheets(sales)];
      
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:U`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        resource: {
          values,
        },
      });
      
      console.log(`Sales data appended to Google Sheets: ${sales.id}`);
    } catch (error) {
      console.error('Failed to append sales data to Google Sheets:', error);
      throw error;
    }
  }

  async updateSalesData(sales: SelectSales, rowIndex: number): Promise<void> {
    try {
      const values = [this.formatSalesDataForSheets(sales)];
      
      await this.sheets.spreadsheets.values.update({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A${rowIndex}:U${rowIndex}`,
        valueInputOption: 'RAW',
        resource: {
          values,
        },
      });
      
      console.log(`Sales data updated in Google Sheets: ${sales.id} at row ${rowIndex}`);
    } catch (error) {
      console.error('Failed to update sales data in Google Sheets:', error);
      throw error;
    }
  }

  async deleteSalesData(salesId: string): Promise<void> {
    try {
      // Find the row with this sales ID
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:A`,
      });

      if (response.data.values) {
        const rowIndex = response.data.values.findIndex((row: string[]) => row[0] === salesId);
        
        if (rowIndex > 0) { // Skip header row (index 0)
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId: this.config.spreadsheetId,
            resource: {
              requests: [{
                deleteDimension: {
                  range: {
                    sheetId: 0, // Assuming first sheet
                    dimension: 'ROWS',
                    startIndex: rowIndex,
                    endIndex: rowIndex + 1,
                  },
                },
              }],
            },
          });
          
          console.log(`Sales data deleted from Google Sheets: ${salesId}`);
        }
      }
    } catch (error) {
      console.error('Failed to delete sales data from Google Sheets:', error);
      throw error;
    }
  }

  async syncAllSalesData(salesData: SelectSales[]): Promise<void> {
    try {
      await this.ensureHeadersExist();
      
      // Clear existing data (except headers)
      await this.sheets.spreadsheets.values.clear({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A2:U`,
      });
      
      if (salesData.length > 0) {
        const values = salesData.map(sales => this.formatSalesDataForSheets(sales));
        
        await this.sheets.spreadsheets.values.append({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A2:U`,
          valueInputOption: 'RAW',
          insertDataOption: 'INSERT_ROWS',
          resource: {
            values,
          },
        });
      }
      
      console.log(`Synced ${salesData.length} sales records to Google Sheets`);
    } catch (error) {
      console.error('Failed to sync all sales data to Google Sheets:', error);
      throw error;
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });
      return true;
    } catch (error) {
      console.error('Google Sheets connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let googleSheetsService: GoogleSheetsService | null = null;

export function getGoogleSheetsService(): GoogleSheetsService | null {
  return googleSheetsService;
}

export function initializeGoogleSheetsService(config: GoogleSheetsConfig): GoogleSheetsService {
  googleSheetsService = new GoogleSheetsService(config);
  return googleSheetsService;
}

export function isGoogleSheetsConfigured(): boolean {
  return googleSheetsService !== null;
}