from datetime import datetime
from typing import Any, Dict, List, Optional
import uuid
from pydantic import BaseModel, ConfigDict, Field
from app.models.product import ProductCategory


# ------------------------------------------------------------------------------
# Product Variant Schemas
# ------------------------------------------------------------------------------

class ProductVariantBase(BaseModel):
    attributes: Dict[str, Any] = Field(
        default_factory=dict,
        description="Dynamic SKU attributes (e.g. {'Size': 'L', 'Color': 'Space Gray'})",
    )
    extra_price: float = Field(
        default=0.0,
        ge=0.0,
        description="Incremental price surcharge for this specific variant option",
    )


class ProductVariantCreate(ProductVariantBase):
    pass


class ProductVariantUpdate(BaseModel):
    attributes: Optional[Dict[str, Any]] = None
    extra_price: Optional[float] = Field(default=None, ge=0.0)


class ProductVariantResponse(ProductVariantBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    product_id: uuid.UUID
    created_at: datetime
    updated_at: datetime


# ------------------------------------------------------------------------------
# Product Schemas
# ------------------------------------------------------------------------------

class ProductBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255, description="Official product or service name")
    category: ProductCategory = Field(..., description="Product category: hardware, service, or subscription")
    description: Optional[str] = Field(default=None, description="Detailed description and specifications")
    unit: str = Field(default="unit", max_length=50, description="Unit of measurement: unit, hour, month, license")
    tax_rate: float = Field(default=0.0, ge=0.0, le=1.0, description="Applicable tax rate as a decimal (e.g. 0.18 for 18%)")
    is_active: bool = Field(default=True, description="Whether the product is currently sellable and available in catalog")


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    category: Optional[ProductCategory] = None
    description: Optional[str] = None
    unit: Optional[str] = Field(default=None, max_length=50)
    tax_rate: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    is_active: Optional[bool] = None


class ProductResponse(ProductBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    variants: List[ProductVariantResponse] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime


class ProductListResponse(BaseModel):
    items: List[ProductResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
