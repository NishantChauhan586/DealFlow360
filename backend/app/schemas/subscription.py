from typing import Optional
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

base_config = ConfigDict(
    from_attributes=True,
    populate_by_name=True,
    alias_generator=to_camel,
)


class SubscriptionResponse(BaseModel):
    model_config = base_config

    id: int
    quote_id: str
    customer_name: str
    customer_email: str
    billing_frequency: str
    mrr_amount: float
    arr_amount: float
    one_time_charges: float
    status: str
    start_date: str
    renewal_date: str

