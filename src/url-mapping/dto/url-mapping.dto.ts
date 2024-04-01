import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { RedirectType } from './url-mapping.enums';
import { InputType, Field, ObjectType } from '@nestjs/graphql';

// DTO for creating a URL entry
export class CreateUrlEntryDto {
  @IsString()
  @IsNotEmpty()
  longUrl: string;

  @IsEnum(RedirectType)
  redirectType: RedirectType;
}

// DTO for updating a URL entry
export class UpdateUrlEntryDto {
  @IsString()
  @IsNotEmpty()
  longUrl: string;

  @IsEnum(RedirectType)
  redirectType: RedirectType;
}

// DTO for retrieving a URL by its shortcode
export class GetUrlByShortCodeDto {
  @IsString()
  @IsNotEmpty()
  shortCode: string;
}

//Input type for creating a new URL entry
@InputType()
export class CreateUrlInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  longUrl: string;

  @Field(() => RedirectType)
  @IsEnum(RedirectType)
  redirectType: RedirectType;
}

//Input type for updating an existing URL entry
@InputType()
export class UpdateUrlInput {
  @Field(() => String)
  @IsString()
  @IsNotEmpty()
  longUrl: string;

  @Field(() => RedirectType)
  @IsEnum(RedirectType)
  redirectType: RedirectType;
}

//Represents the response after creating a URL
@ObjectType()
export class UrlCreationResponse {
  @Field(() => String)
  shortUrl?: string;

  @Field(() => RedirectType)
  redirectType?: RedirectType;

  @Field(() => String)
  message?: string;
}

//Represents the response after updating a URL.
@ObjectType()
export class UrlUpdateResponse {
  @Field(() => String)
  shortUrl: string;

  @Field(() => RedirectType)
  redirectType?: RedirectType;

  @Field(() => String)
  message: string;
}

//Provides detailed information about a URL
@ObjectType()
export class UrlInfoResponse {
  @Field(() => String)
  shortUrl: string;

  @Field(() => String)
  longUrl: string;

  @Field(() => RedirectType)
  redirectType: RedirectType;

  @Field(() => Number)
  visitCount: number;

  @Field(() => Date, { nullable: true })
  lastVisited: Date | null;

  @Field(() => Date)
  createdAt: Date;

  @Field(() => Date)
  updatedAt: Date;
}