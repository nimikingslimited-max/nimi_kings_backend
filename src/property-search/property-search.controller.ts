import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PropertySearchService } from './property-search.service.js';
import { AdvancedSearchDto } from './dto/advanced-search.dto.js';
import { NearbySearchDto } from './dto/nearby-search.dto.js';
import { MapBoundsDto } from './dto/map-bounds.dto.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('Property Search & Geospatial Discovery')
@Controller('property-search')
export class PropertySearchController {
  constructor(private readonly searchService: PropertySearchService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'Advanced multi-faceted property discovery (keyword, price range, verification badge, features, sorting)',
  })
  @ApiResponse({
    status: 200,
    description: 'Paginated search results with verification badges and media',
  })
  advancedSearch(@Query() query: AdvancedSearchDto) {
    return this.searchService.advancedSearch(query);
  }

  @Public()
  @Get('nearby')
  @ApiOperation({
    summary:
      'Geospatial proximity search: find properties within a radius (km) of coordinates sorted by distance',
  })
  @ApiResponse({
    status: 200,
    description: 'List of nearby properties with calculated distanceKm',
  })
  searchNearby(@Query() query: NearbySearchDto) {
    return this.searchService.searchNearby(query);
  }

  @Public()
  @Get('map-bounds')
  @ApiOperation({
    summary:
      'Interactive map viewport search: find properties inside North-East and South-West bounding box coordinates',
  })
  @ApiResponse({
    status: 200,
    description: 'Properties within map viewport for marker rendering',
  })
  searchByMapBounds(@Query() query: MapBoundsDto) {
    return this.searchService.searchByMapBounds(query);
  }

  @Public()
  @Get('locations')
  @ApiOperation({
    summary:
      'Get aggregated property counts grouped by State, City, and Property Type for frontend filter facets',
  })
  @ApiResponse({
    status: 200,
    description: 'Faceted counts for states, cities, and property categories',
  })
  getLocationAggregations() {
    return this.searchService.getLocationAggregations();
  }
}
