export interface SearchResult {
    id: string;
    code?: string;
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    additionalInfo?: Record<string, any>;
    usageCount: number;
    isFavorite: boolean;
}
export interface SearchOptions {
    limit?: number;
    offset?: number;
    category?: string;
    includeInactive?: boolean;
    userFavoritesFirst?: boolean;
    userId?: string;
    minScore?: number;
}
export declare class ClinicalAutocompleteService {
    private readonly DEFAULT_LIMIT;
    private readonly MIN_SEARCH_LENGTH;
    searchDiagnosisCodes(searchTerm: string, options?: SearchOptions): Promise<SearchResult[]>;
    searchMedications(searchTerm: string, options?: SearchOptions): Promise<SearchResult[]>;
    searchLabTests(searchTerm: string, options?: SearchOptions): Promise<SearchResult[]>;
    searchProcedures(searchTerm: string, options?: SearchOptions): Promise<SearchResult[]>;
    getUserFavorites(itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM', userId?: string, limit?: number): Promise<SearchResult[]>;
    toggleFavorite(userId: string, itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM', itemId: string, itemName: string): Promise<boolean>;
    getCategories(itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM'): Promise<string[]>;
    getSearchSuggestions(itemType: 'DIAGNOSIS' | 'MEDICATION' | 'LAB_TEST' | 'PROCEDURE' | 'SYMPTOM', limit?: number): Promise<string[]>;
    private logSearchAnalytics;
    recordSelection(userId: string, searchTerm: string, searchType: string, selectedItemId: string, selectedItemName: string): Promise<void>;
}
//# sourceMappingURL=ClinicalAutocompleteService.d.ts.map