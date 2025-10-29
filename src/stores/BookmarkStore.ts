import { makeAutoObservable, action } from 'mobx';
import {
  getRouteBookmarks,
  createRouteBookmark,
  deleteRouteBookmark,
  getStationBookmarks,
  createStationBookmark,
  deleteStationBookmark
} from '@/utils/api/bookmarkApi';
import type {
  RouteBookmarksResponse,
  StationBookmarksResponse
} from '@/utils/api/types';

interface BookmarkLoadingState {
  routeBookmarksLoading: boolean;
  stationBookmarksLoading: boolean;
  error: string | null;
}

/**
 * BookmarkStore - 사용자 북마크 관리
 *
 * 노선 및 정류장 북마크 상태를 관리하고 API와 동기화합니다.
 * UserStore의 user 정보를 기반으로 북마크 데이터를 로드합니다.
 */
class BookmarkStore {
  // 북마크 데이터: Set으로 관리하여 빠른 검색 및 중복 방지
  routeBookmarks: Set<string> = new Set(); // route_name
  stationBookmarks: Set<string> = new Set(); // station_id

  // 로딩 상태
  loadingState: BookmarkLoadingState = {
    routeBookmarksLoading: false,
    stationBookmarksLoading: false,
    error: null
  };

  constructor() {
    makeAutoObservable(this);
  }

  // ============================================================================
  // 초기화 메서드
  // ============================================================================

  /**
   * 사용자 북마크 데이터 일괄 로드
   * @param user - 사용자 ID
   */
  async initializeBookmarks(user: string): Promise<void> {
    console.log(`[BookmarkStore] Initializing bookmarks for user: ${user}`);

    try {
      // 노선 및 정류장 북마크를 병렬로 로드
      await Promise.all([
        this.loadRouteBookmarks(user),
        this.loadStationBookmarks(user)
      ]);

      console.log(`[BookmarkStore] Bookmarks initialized - Routes: ${this.routeBookmarks.size}, Stations: ${this.stationBookmarks.size}`);
    } catch (error) {
      console.error('[BookmarkStore] Failed to initialize bookmarks:', error);
      this.setError(error instanceof Error ? error.message : 'Bookmark 초기화 실패');
    }
  }

  // ============================================================================
  // 노선 북마크 관리
  // ============================================================================

  /**
   * 노선 북마크 목록 로드
   * @param user - 사용자 ID
   */
  async loadRouteBookmarks(user: string): Promise<void> {
    this.setRouteBookmarksLoading(true);

    try {
      const response: RouteBookmarksResponse = await getRouteBookmarks(user);

      // Set 초기화 및 데이터 추가
      this.routeBookmarks.clear();
      response.bookmarks.forEach(bookmark => {
        this.routeBookmarks.add(bookmark.route_name);
      });

      console.log(`[BookmarkStore] Route bookmarks loaded: ${this.routeBookmarks.size} routes`);
    } catch (error) {
      console.error('[BookmarkStore] Failed to load route bookmarks:', error);
      this.setError(error instanceof Error ? error.message : '노선 북마크 로드 실패');
    } finally {
      this.setRouteBookmarksLoading(false);
    }
  }

  /**
   * 노선 북마크 토글 (추가/제거) - Optimistic UI Update
   * @param user - 사용자 ID
   * @param routeName - 노선 번호
   */
  async toggleRouteBookmark(user: string, routeName: string): Promise<void> {
    const isBookmarked = this.isRouteBookmarked(routeName);

    // 1. 즉시 UI 업데이트 (Optimistic Update)
    if (isBookmarked) {
      this.removeRouteBookmark(routeName);
      console.log(`[BookmarkStore] Optimistically removed route bookmark: ${routeName}`);
    } else {
      this.addRouteBookmark(routeName);
      console.log(`[BookmarkStore] Optimistically added route bookmark: ${routeName}`);
    }

    // 2. 백그라운드에서 API 호출
    try {
      if (isBookmarked) {
        await deleteRouteBookmark(user, routeName);
        console.log(`[BookmarkStore] Route bookmark removal confirmed by server: ${routeName}`);
      } else {
        await createRouteBookmark(user, routeName);
        console.log(`[BookmarkStore] Route bookmark addition confirmed by server: ${routeName}`);
      }
    } catch (error) {
      // 3. API 실패 시 롤백
      console.error(`[BookmarkStore] Failed to toggle route bookmark (${routeName}), rolling back:`, error);

      if (isBookmarked) {
        // 제거 실패 -> 다시 추가
        this.addRouteBookmark(routeName);
        console.log(`[BookmarkStore] Rolled back: re-added route bookmark ${routeName}`);
      } else {
        // 추가 실패 -> 다시 제거
        this.removeRouteBookmark(routeName);
        console.log(`[BookmarkStore] Rolled back: removed route bookmark ${routeName}`);
      }

      this.setError(error instanceof Error ? error.message : '노선 북마크 토글 실패');
      throw error; // UI에서 에러 처리 가능하도록 throw
    }
  }

  /**
   * 노선 북마크 추가 (로컬 상태만 업데이트)
   */
  private addRouteBookmark = action((routeName: string) => {
    this.routeBookmarks.add(routeName);
  });

  /**
   * 노선 북마크 제거 (로컬 상태만 업데이트)
   */
  private removeRouteBookmark = action((routeName: string) => {
    this.routeBookmarks.delete(routeName);
  });

  /**
   * 노선 북마크 여부 확인
   */
  isRouteBookmarked(routeName: string): boolean {
    return this.routeBookmarks.has(routeName);
  }

  /**
   * 북마크된 노선 목록 반환 (정렬된 배열)
   */
  get bookmarkedRoutes(): string[] {
    return Array.from(this.routeBookmarks).sort();
  }

  // ============================================================================
  // 정류장 북마크 관리
  // ============================================================================

  /**
   * 정류장 북마크 목록 로드
   * @param user - 사용자 ID
   */
  async loadStationBookmarks(user: string): Promise<void> {
    this.setStationBookmarksLoading(true);

    try {
      const response: StationBookmarksResponse = await getStationBookmarks(user);

      // Set 초기화 및 데이터 추가
      this.stationBookmarks.clear();
      response.bookmarks.forEach(bookmark => {
        this.stationBookmarks.add(bookmark.station_id);
      });

      console.log(`[BookmarkStore] Station bookmarks loaded: ${this.stationBookmarks.size} stations`);
    } catch (error) {
      console.error('[BookmarkStore] Failed to load station bookmarks:', error);
      this.setError(error instanceof Error ? error.message : '정류장 북마크 로드 실패');
    } finally {
      this.setStationBookmarksLoading(false);
    }
  }

  /**
   * 정류장 북마크 토글 (추가/제거) - Optimistic UI Update
   * @param user - 사용자 ID
   * @param stationId - 정류장 ID
   */
  async toggleStationBookmark(user: string, stationId: string): Promise<void> {
    const isBookmarked = this.isStationBookmarked(stationId);

    // 1. 즉시 UI 업데이트 (Optimistic Update)
    if (isBookmarked) {
      this.removeStationBookmark(stationId);
      console.log(`[BookmarkStore] Optimistically removed station bookmark: ${stationId}`);
    } else {
      this.addStationBookmark(stationId);
      console.log(`[BookmarkStore] Optimistically added station bookmark: ${stationId}`);
    }

    // 2. 백그라운드에서 API 호출
    try {
      if (isBookmarked) {
        await deleteStationBookmark(user, stationId);
        console.log(`[BookmarkStore] Station bookmark removal confirmed by server: ${stationId}`);
      } else {
        await createStationBookmark(user, stationId);
        console.log(`[BookmarkStore] Station bookmark addition confirmed by server: ${stationId}`);
      }
    } catch (error) {
      // 3. API 실패 시 롤백
      console.error(`[BookmarkStore] Failed to toggle station bookmark (${stationId}), rolling back:`, error);

      if (isBookmarked) {
        // 제거 실패 -> 다시 추가
        this.addStationBookmark(stationId);
        console.log(`[BookmarkStore] Rolled back: re-added station bookmark ${stationId}`);
      } else {
        // 추가 실패 -> 다시 제거
        this.removeStationBookmark(stationId);
        console.log(`[BookmarkStore] Rolled back: removed station bookmark ${stationId}`);
      }

      this.setError(error instanceof Error ? error.message : '정류장 북마크 토글 실패');
      throw error; // UI에서 에러 처리 가능하도록 throw
    }
  }

  /**
   * 정류장 북마크 추가 (로컬 상태만 업데이트)
   */
  private addStationBookmark = action((stationId: string) => {
    this.stationBookmarks.add(stationId);
  });

  /**
   * 정류장 북마크 제거 (로컬 상태만 업데이트)
   */
  private removeStationBookmark = action((stationId: string) => {
    this.stationBookmarks.delete(stationId);
  });

  /**
   * 정류장 북마크 여부 확인
   */
  isStationBookmarked(stationId: string): boolean {
    return this.stationBookmarks.has(stationId);
  }

  /**
   * 북마크된 정류장 목록 반환 (정렬된 배열)
   */
  get bookmarkedStations(): string[] {
    return Array.from(this.stationBookmarks).sort();
  }

  // ============================================================================
  // 로딩 상태 관리
  // ============================================================================

  setRouteBookmarksLoading = action((loading: boolean) => {
    this.loadingState.routeBookmarksLoading = loading;
    if (loading) {
      this.loadingState.error = null;
    }
  });

  setStationBookmarksLoading = action((loading: boolean) => {
    this.loadingState.stationBookmarksLoading = loading;
    if (loading) {
      this.loadingState.error = null;
    }
  });

  setError = action((error: string | null) => {
    this.loadingState.error = error;
  });

  get isLoading(): boolean {
    return this.loadingState.routeBookmarksLoading || this.loadingState.stationBookmarksLoading;
  }

  get hasError(): boolean {
    return !!this.loadingState.error;
  }

  // ============================================================================
  // 초기화 및 정리
  // ============================================================================

  /**
   * 모든 북마크 데이터 초기화
   */
  clearAllBookmarks = action(() => {
    this.routeBookmarks.clear();
    this.stationBookmarks.clear();
    this.loadingState = {
      routeBookmarksLoading: false,
      stationBookmarksLoading: false,
      error: null
    };
    console.log('[BookmarkStore] All bookmarks cleared');
  });
}

export const bookmarkStore = new BookmarkStore();
