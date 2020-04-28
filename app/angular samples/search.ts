... import...
@Component({
  selector: 'search-line',
  template: require('./search-line.component.html')
})
export class SearchLineComponent implements OnInit, OnDestroy {
  searchForm = new SearchLinePanel();
  currentAnchor: AnchorDimension;
  currentComparisonAnchor: AnchorDimension;
  noSubscription: string;
  subscriptionArray = Array<Subscription>();
  repo: Repo;
  anchorDimensions: AnchorDimension[];
  anchorComparisonDimensions: AnchorDimension[];
  currentForm: SearchLineForm;
  searchResultSubscription: Subscription;
  isComparisonMode = false;
  et = EntityType;
  helper = Helper;
  isSearchBtnShow = true;
  tempAnchor: AnchorDimension;
  subjectAnchorChanged = new Subject<{ res: boolean }>();

  constructor(
    private searchService: SearchService,
    private repoService: RepoService,
    private dialogService: DialogService,
    private userService: UserService) {
    this.repo = this.repoService.currentRepo;
  }

  ngOnInit() {
    // TODO: change logic yo prevent select changed before user doesnt click YES
    this.subjectAnchorChanged.subscribe(d => {
      this.setSelectedAnchor(d.res ? this.currentAnchor : this.tempAnchor, true);
    });

    this.anchorDimensions = Helper.getAnchorDimensions()
      .filter(a => a.isSelectable)
      .sort((a, b) => a.id - b.id);

    this.anchorComparisonDimensions = this.anchorDimensions.filter(a => a.isSelectable && a.isComparison);

    this.subscriptionArray.push(this.repoService.repoChanged.subscribe(newRepo => {
      this.repo = newRepo;
      this.currentAnchor = this.anchorDimensions.find(a => a.entityType === EntityType[this.repo.anchorDimension]);
      this.tempAnchor = Object.assign({}, this.currentAnchor);
      this.searchService.setAnchor.next(this.currentAnchor);
      this.currentComparisonAnchor = this.anchorComparisonDimensions.find(a => a.entityType === EntityType[this.repo.anchorDimension]);
      if (this.currentComparisonAnchor == null) {
        this.currentComparisonAnchor = this.anchorComparisonDimensions.find(a => a.entityType === EntityType.Company);
      }

      this.setCurrentForm();
    }));

    this.subscriptionArray.push(this.searchForm.company.searchType.valueChanges.subscribe(v => {
      this.searchForm.company.searchText.updateValueAndValidity();
    }));

    this.subscriptionArray.push(this.searchForm.underwriter.searchType.valueChanges.subscribe(v => {
      this.searchForm.underwriter.searchText.updateValueAndValidity();
    }));

    this.subscriptionArray.push(this.searchForm.patentClassification.searchType.valueChanges.subscribe(v => {
      this.repoService.previousCurrentClassificationType = this.repoService.currentClassificationType;

      this.repoService.currentClassificationType = Helper.getClassificationType(v);
      this.repoService.initClassification.next();
    }));
  }

  ngOnDestroy(): void {
    this.subscriptionArray.forEach(a => a.unsubscribe());
  }

  private setSelectedComparisonAnchor(anchor: AnchorDimension) {
    this.setCurrentForm(true);
    this.searchService.anchorChanged.next(anchor);
  }

  private setSelectedAnchor(anchor: AnchorDimension, proceed = false): void {
    if (!proceed && this.repoService.getMapRefinements().size > 0) {
      this.dialogService.openDialog.next({
        title: 'Change entity type',
        body: 'You will lose all search criteria. Do you want to continue?',
        btn: 'Yes',
        subject: this.subjectAnchorChanged
      });
      return;
    }

    this.isComparisonMode = false;

    if (anchor.entityType === EntityType.ComparisonMode) {
      this.isComparisonMode = true;
      this.currentComparisonAnchor = this.anchorComparisonDimensions.find(c => c.entityType === EntityType.Company);
      this.setSelectedComparisonAnchor(this.currentComparisonAnchor);
      return;
    }

    if (this.searchResultSubscription) {
      this.searchResultSubscription.unsubscribe();
    }

    if (!this.userService.hasAccessToAnchor(anchor)) {
      this.hasNoSubscription(this.currentAnchor);

      this.dialogService.openDialog.next({
        title: 'Subscription',
        body: this.noSubscription
      });

      return;
    }

    this.setCurrentForm();
    this.searchService.anchorChanged.next(anchor);
  }

  private hasNoSubscription(anchor: AnchorDimension) {
    this.noSubscription = SearchConstant.noSubscription(Helper.getEntityTypeLabel(anchor.entityType));
  }

  private onSearch(): void {
    if (this.isFormValid()) {
      const obj = new SearchQuery();
      obj.entityType = this.currentAnchor.entityType;

      switch (this.currentAnchor.entityType) {
        case EntityType.PracticeArea:
        case EntityType.Security:
        case EntityType.TrademarkClassification:
        case EntityType.Court:
        case EntityType.HQLocation:
        case EntityType.Industry:
      }

      if (this.searchResultSubscription) {
        this.searchResultSubscription.unsubscribe();
      }

      this.searchResultSubscription = this.searchService.getSearchResult(obj)
        .finally(() => this.reloadForm())
        .subscribe(result => {
          this.searchService.searchParams = result.data.searchParameters;
          this.searchService.searchId = result.searchId;
          this.searchService.searchChanged.next(result);
        });
    }
  }

  private onKey(key: KeyboardEvent) {
    if (key.code === 'Enter' || key.key === 'Enter' && key.target) {
      (key.target as HTMLElement).blur();
      this.onSearch();
    }
    key.stopPropagation();
  }

  private isFormValid(): boolean {
    return this.currentForm.group
      ? this.currentForm.group.valid
      : this.currentForm.control
        ? this.currentForm.control.valid
        : true;
  }

  private setCurrentForm(isComparison = false): void {
    this.isSearchBtnShow = true;
    switch (isComparison ? this.currentComparisonAnchor.entityType : this.currentAnchor.entityType) {
      case EntityType.Attorney:
        this.currentForm = this.searchForm.attorney;
        break;
      case EntityType.Company:
        this.currentForm = this.searchForm.company;
        break;
      case EntityType.HQLocation:
        this.currentForm = this.searchForm.companyLocation;
        break;
      case EntityType.Court:
        this.currentForm = this.searchForm.court;
        break;
      case EntityType.Industry:
        this.currentForm = this.searchForm.industry;
        break;
    }

    this.repoService.currentForm = this.currentForm;
  }

  private reloadForm(): void {
    if (this.currentForm.group) {
      this.currentForm.searchText.reset();
      if (this.currentForm.optional) {
        this.currentForm.optional.reset();
      }
      return;
    }
    this.currentForm.control.reset();
  }

  private showAllAreas(): void {
    this.searchService.showAllAreas.next();
  }

  //////////////////////////////////////////
  getCompanyPlaceholder(): string {
    return this.searchForm.company.searchType.value === 'Name'
      ? this.searchForm.company.textPlaceholder
      : this.searchForm.company.tickerTextPlaceholder;
  }
}
