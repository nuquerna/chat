import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';
import { ReplaySubject } from 'rxjs/ReplaySubject';
import 'rxjs/add/observable/empty';
import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/finally';
import 'rxjs/add/operator/switchMap';
import 'rxjs/add/operator/delay';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/expand';
import 'rxjs/add/operator/filter';

@Injectable()
export class SearchService {
    private _searchParams = new SearchParams();
    private _searchId = '';

    searchChanged = new Subject<SearchResult>();
    anchorChanged = new Subject<AnchorDimension>();
    setAnchor = new ReplaySubject<AnchorDimension>(1);
    showAllAreas = new Subject();

    previousSearchParams: HttpParams;

    constructor(private httpClient: HttpClient) { }

    private getSearchId(obj: SearchQuery): Observable<any> {
        const paramsObj = {
            entityType: EntityType[obj.entityType],
            search: obj.text
        };

        if (obj.type) {
            paramsObj['searchType'] = obj.type;
        }
        if (obj.optional) {
            paramsObj['optional'] = obj.optional;
        }

        const params = new HttpParams({ fromObject: paramsObj });

        if (obj.entityType === EntityType.Company
            || obj.entityType === EntityType.Firm
            || obj.entityType === EntityType.Underwriter) {
            this.previousSearchParams = params;
        }
        return this.httpClient.get(SearchConstant.searchUrl, { params });
    }

    private expandRequest(id: SearchId, url: string): Observable<any> {
        const request = this.httpClient.get(`${url}/${id.searchId}`);

        return request
            .expand(o => (o as SearchResult).isFinished ? Observable.empty() : request.delay(Constant.msPollingDelay))
            .map(r => new SearchResult(r))
            .filter(f => f.isFinished);
    }

    getSearchResult(obj: SearchQuery): Observable<SearchResult> {
        return this.getSearchId(obj).switchMap(id => this.expandRequest(id, SearchConstant.searchUrlResult));
    }

    getSubsidiriesResult(txt: string): Observable<SearchResult> {
        return this.getSearchSubsidiariesId(txt).switchMap(id => this.expandRequest(id, SearchConstant.searchUrlResult));
    }

    getSearchSubsidiariesId(id: string): Observable<any> {
        const params = {};
         this.previousSearchParams.keys().forEach(element => {
             params[element] = this.previousSearchParams.get(element);
        });
        params['entityId'] = id;

        return this.httpClient.get(SearchConstant.searchUrl, { params: params});
    }

    getTaxonomy(dimensionType: DimensionType, fact: FactType): Observable<SearchResult> {
        const params = new HttpParams().set('fact', FactType[fact]);

        return this.httpClient.get(`${SearchConstant.taxonomyUrl}/${DimensionType[dimensionType]}`, { params })
            .switchMap(id => this.expandRequest(id as SearchId, SearchConstant.searchUrlResult));
    }

    getTreeTaxonomy(dt: DimensionType, id?: string): Observable<any> {
        return this.httpClient.get(`${SearchConstant.taxonomyUrl}/${DimensionType[dt]}${id ? '/' + id : ''}`)
            .switchMap(s => this.expandRequest(s as SearchId, SearchConstant.searchUrlResult));
    }

    getTreeTaxonomies(dt: DimensionType, ids: string[]): Observable<any> {
        return this.httpClient.post(`${SearchConstant.taxonomiesUrl}/${DimensionType[dt]}`, ids);
    }

    getEntityTaxonomy(entityType: EntityType, id: string): Observable<any> {
        return this.httpClient.get(`${SearchConstant.entityTaxonomyUrl}/${EntityType[entityType]}/${id}`);
    }

    setRestEvent(obj: any): Observable<any> {
        return this.httpClient.post(`${SearchConstant.defaultEvents}/SendRestEvent`, obj);
    }

    getEvents(ids: Array<string>, dt: DimensionType, level = 1): Observable<any> {
        return this.httpClient.post(`${SearchConstant.events}/${DimensionType[dt]}/eventCounts`, { ids: ids, level: level });
    }

    get searchParams(): SearchParams {
        return this._searchParams;
    }

    set searchParams(sp: SearchParams) {
        this._searchParams = Object.assign(this._searchParams, sp);
    }

    get searchId(): string {
        return this._searchId;
    }

    set searchId(id: string) {
        this._searchId = id;
    }
}
