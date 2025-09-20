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
  private sheetId: number | null = null;

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
      
      // Resolve and cache the sheetId for the worksheet
      await this.resolveSheetId();
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
      throw new Error('Google Sheets initialization failed');
    }
  }

  private async resolveSheetId(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.get({
        spreadsheetId: this.config.spreadsheetId,
      });

      const sheet = response.data.sheets?.find((s: any) => 
        s.properties?.title === this.config.worksheetName
      );

      if (sheet) {
        this.sheetId = sheet.properties.sheetId;
        console.log(`Found worksheet "${this.config.worksheetName}" with ID: ${this.sheetId}`);
      } else {
        console.warn(`Worksheet "${this.config.worksheetName}" not found, using sheetId: 0`);
        this.sheetId = 0;
      }
    } catch (error) {
      console.error('Failed to resolve sheet ID:', error);
      this.sheetId = 0; // Fallback to first sheet
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

  async updateSalesData(sales: SelectSales): Promise<void> {
    try {
      const rowIndex = await this.findRowIndexBySalesId(sales.id || '');
      
      if (rowIndex !== null) {
        const values = [this.formatSalesDataForSheets(sales)];
        
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.config.spreadsheetId,
          range: `${this.config.worksheetName}!A${rowIndex + 1}:U${rowIndex + 1}`, // +1 because sheet rows are 1-indexed
          valueInputOption: 'RAW',
          resource: {
            values,
          },
        });
        
        console.log(`Sales data updated in Google Sheets: ${sales.id} at row ${rowIndex + 1}`);
      } else {
        console.warn(`Sales ID ${sales.id} not found for update, appending new row instead`);
        await this.appendSalesData(sales);
      }
    } catch (error) {
      console.error('Failed to update sales data in Google Sheets:', error);
      throw error;
    }
  }

  async findRowIndexBySalesId(salesId: string): Promise<number | null> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.config.spreadsheetId,
        range: `${this.config.worksheetName}!A:A`,
      });

      if (response.data.values) {
        const rowIndex = response.data.values.findIndex((row: string[]) => row[0] === salesId);
        return rowIndex > 0 ? rowIndex : null; // Skip header row (index 0)
      }
      return null;
    } catch (error) {
      console.error('Failed to find row index by sales ID:', error);
      return null;
    }
  }

  async deleteSalesData(salesId: string): Promise<void> {
    try {
      const rowIndex = await this.findRowIndexBySalesId(salesId);
      
      if (rowIndex !== null) {
        await this.sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.config.spreadsheetId,
          resource: {
            requests: [{
              deleteDimension: {
                range: {
                  sheetId: this.sheetId || 0,
                  dimension: 'ROWS',
                  startIndex: rowIndex,
                  endIndex: rowIndex + 1,
                },
              },
            }],
          },
        });
        
        console.log(`Sales data deleted from Google Sheets: ${salesId}`);
      } else {
        console.warn(`Sales ID ${salesId} not found in Google Sheets for deletion`);
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